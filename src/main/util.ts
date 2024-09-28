import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import ffmpeg from "fluent-ffmpeg";
import { Resolutions, Rotations } from "../constants";

const FFMPEG = os.platform() == "linux" ? "ffmpeg" : "ffmpeg.exe";
const FFPROBE = os.platform() == "linux" ? "ffprobe" : "ffprobe.exe";

class Util {
    private convertDestFile: string | null;
    private command: ffmpeg.FfmpegCommand | null;
    private isDev: boolean;
    private resourcePath: string;

    constructor() {
        this.convertDestFile = null;
        this.command = null;
        this.isDev = process.env.NODE_ENV === "development";
        this.resourcePath = this.isDev ? path.join(__dirname, "..", "..", "resources") : path.join(process.resourcesPath, "resources");

        const ffmpegPath = path.join(this.resourcePath, FFMPEG);
        ffmpeg.setFfmpegPath(ffmpegPath);
        const ffprobePath = path.join(this.resourcePath, FFPROBE);
        ffmpeg.setFfprobePath(ffprobePath);
    }

    extractFilesFromArgv(target?: string[]) {
        if (target) {
            return target.slice(1, target.length);
        }

        if (process.argv[1] == ".") return [];

        return process.argv.slice(1, process.argv.length);
    }

    exists(target: string | undefined | null, createIfNotFound = false) {
        if (!target) return false;

        const result = fs.existsSync(target);

        if (result == false && createIfNotFound) {
            fs.mkdirSync(target);
        }

        return result;
    }

    toFile(fullPath: string): Mp.MediaFile {
        const statInfo = fs.statSync(fullPath);

        const encodedPath = path.join(path.dirname(fullPath), encodeURIComponent(path.basename(fullPath)));

        return {
            id: crypto.randomUUID(),
            fullPath,
            dir: path.dirname(fullPath),
            src: this.isDev ? `app://${encodedPath}` : encodedPath,
            name: decodeURIComponent(encodeURIComponent(path.basename(fullPath))),
            date: statInfo.mtimeMs,
            extension: path.extname(fullPath),
        };
    }

    updateFile(fullPath: string, currentFile: Mp.MediaFile): Mp.MediaFile {
        const encodedPath = path.join(path.dirname(fullPath), encodeURIComponent(path.basename(fullPath)));

        return {
            id: currentFile.id,
            fullPath,
            dir: path.dirname(fullPath),
            src: this.isDev ? `app://${encodedPath}` : encodedPath,
            name: decodeURIComponent(encodeURIComponent(path.basename(fullPath))),
            date: currentFile.date,
            extension: currentFile.extension,
        };
    }

    shuffle(targets: any[]) {
        const result = [];
        let size = 0;
        let randomIndex = 0;

        while (targets.length > 0) {
            size = targets.length;
            randomIndex = Math.floor(Math.random() * size);

            result.push(targets[randomIndex]);
            targets.splice(randomIndex, 1);
        }

        return result;
    }

    private localCompareName(a: Mp.MediaFile, b: Mp.MediaFile) {
        return a.name.replace(path.extname(a.name), "").localeCompare(b.name.replace(path.extname(a.name), ""));
    }

    sort(files: Mp.MediaFile[], sortOrder: Mp.SortOrder) {
        if (!files.length) return;

        switch (sortOrder) {
            case "NameAsc":
                return files.sort((a, b) => this.localCompareName(a, b));
            case "NameDesc":
                return files.sort((a, b) => this.localCompareName(b, a));
            case "DateAsc":
                return files.sort((a, b) => a.date - b.date || this.localCompareName(a, b));
            case "DateDesc":
                return files.sort((a, b) => b.date - a.date || this.localCompareName(a, b));
        }
    }

    groupBy<T>(items: T[], key: keyof T) {
        return items.reduce<{ [groupKey: string]: T[] }>((acc, current) => {
            (acc[current[key] as unknown as string] = acc[current[key] as unknown as string] || []).push(current);
            return acc;
        }, {});
    }

    sortByGroup(files: Mp.MediaFile[], sortOrder: Mp.SortOrder) {
        if (!files.length) return;

        const groups = this.groupBy(files, "dir");

        const result = Object.values(groups)
            .map((group) => this.sort(group, sortOrder))
            .flat() as Mp.MediaFile[];
        files.length = 0;
        files.push(...result);
    }

    writeTag(file: Mp.MediaFile, tagName: string) {
        const tag = `[${tagName}]-`;

        if (file.name.startsWith(tag)) return;

        const newName = path.join(file.dir, `${tag}${file.name}`);
        fs.renameSync(file.fullPath, newName);
    }

    async getMediaMetadata(fullPath: string): Promise<Mp.Metadata> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(fullPath, async (error: any, FfprobeData: ffmpeg.FfprobeData) => {
                if (error) {
                    reject(new Error("Read media metadata failed"));
                }
                const metadata = FfprobeData as Mp.Metadata;
                metadata.Volume = await this.getVolume(fullPath);
                resolve(metadata);
            });
        });
        // const metadata = (await win32props.read(fullPath, format)) as Mp.Metadata;
        // metadata.Volume = await this.getVolume(fullPath);
        // return metadata;
    }

    async getVolume(sourcePath: string): Promise<Mp.MediaVolume> {
        return new Promise((resolve, _reject) => {
            this.command = ffmpeg({ source: sourcePath });

            this.command
                .outputOptions(["-vn", "-af", "volumedetect", "-f null"])
                .on("error", async (stderr) => {
                    console.log(stderr);
                    this.cleanUp();
                    resolve({ n_samples: "N/A", max_volume: "N/A", mean_volume: "N/A" });
                })
                .on("end", (_stdout, stderr) => {
                    this.finishConvert();
                    resolve(this.extractVolumeInfo(stderr));
                })
                .saveToFile("-");
        });
    }

    private extractVolumeInfo(std: string): Mp.MediaVolume {
        const n_samples = std.match(/n_samples:\s?([0-9]*)\s?/)?.at(1) ?? "";
        const mean_volume = std.match(/mean_volume:\s?([^ ]*)\s?dB/)?.at(1) ?? "";
        const max_volume = std.match(/max_volume:\s?([^ ]*)\s?dB/)?.at(1) ?? "";
        return {
            n_samples,
            mean_volume,
            max_volume,
        };
    }

    cancelConvert() {
        if (this.command) {
            this.command.kill("SIGKILL");
        }
    }

    async convertAudio(sourcePath: string, destPath: string, options: Mp.ConvertOptions) {
        if (this.command) throw new Error("Process busy");

        this.convertDestFile = destPath;

        const metadata = await this.getMediaMetadata(sourcePath);

        if (!metadata.streams[1].bit_rate) {
            metadata.streams[1].bit_rate = "0";
        }

        const audioBitrate = options.audioBitrate !== "BitrateNone" ? parseInt(options.audioBitrate) : Math.ceil(parseInt(metadata.streams[1].bit_rate) / 1000);
        let audioVolume = options.audioVolume !== "1" ? `volume=${options.audioVolume}` : "";

        if (options.maxAudioVolume) {
            const maxVolumeText = metadata.Volume.max_volume;
            const maxVolume = parseFloat(maxVolumeText);
            if (maxVolume >= 0) {
                throw new Error("No max_volume");
            }
            audioVolume = `volume=${maxVolume * -1}dB`;
        }

        return new Promise((resolve, reject) => {
            this.command = ffmpeg({ source: sourcePath });

            this.command.format("mp3").audioCodec("libmp3lame");

            if (audioBitrate > 0) {
                this.command.audioBitrate(audioBitrate);
            }

            if (audioVolume) {
                this.command.audioFilters(audioVolume);
            }

            this.command
                .on("error", async (err: any) => {
                    this.cleanUp();
                    reject(new Error(err.message));
                })
                .on("end", () => {
                    this.finishConvert();
                    resolve(undefined);
                })
                .save(destPath);
        });
    }

    async convertVideo(sourcePath: string, destPath: string, options: Mp.ConvertOptions) {
        if (this.command) throw new Error("Process busy");

        this.convertDestFile = destPath;

        const metadata = await this.getMediaMetadata(sourcePath);

        const size = Resolutions[options.frameSize] ? Resolutions[options.frameSize] : await this.getSize(metadata);
        const rotation = Rotations[options.rotation] ? `transpose=${Rotations[options.rotation]}` : "";

        if (!metadata.streams[1].bit_rate) {
            metadata.streams[1].bit_rate = "0";
        }

        const audioBitrate = options.audioBitrate !== "BitrateNone" ? parseInt(options.audioBitrate) : Math.ceil(parseInt(metadata.streams[1].bit_rate) / 1000);
        let audioVolume = options.audioVolume !== "1" ? `volume=${options.audioVolume}` : "";

        if (options.maxAudioVolume) {
            const maxVolumeText = metadata.Volume.max_volume;
            const maxVolume = parseFloat(maxVolumeText);
            if (maxVolume >= 0) {
                throw new Error("No max_volume");
            }
            audioVolume = `volume=${maxVolume * -1}dB`;
        }

        return new Promise((resolve, reject) => {
            this.command = ffmpeg({ source: sourcePath });

            this.command.format("mp4").videoCodec("libx264").size(size);
            if (rotation) {
                this.command.withVideoFilter(rotation);
            }
            this.command.audioCodec("libmp3lame");

            if (audioBitrate > 0) {
                this.command.audioBitrate(audioBitrate);
            }

            if (audioVolume) {
                this.command.audioFilters(audioVolume);
            }

            this.command
                .on("error", async (err: any) => {
                    this.cleanUp();
                    reject(new Error(err.message));
                })
                .on("end", () => {
                    this.finishConvert();
                    resolve(undefined);
                })
                .save(destPath);
        });
    }

    private async getSize(metadata: Mp.Metadata) {
        const rotation = metadata.streams[0].rotation;

        if (rotation === "-90" || rotation === "90") {
            return `${metadata.streams[0].height}x${metadata.streams[0].width}`;
        }

        return `${metadata.streams[0].width}x${metadata.streams[0].height}`;
    }

    private finishConvert() {
        this.cancelConvert();
        this.command = null;
        this.convertDestFile = null;
    }

    private cleanUp() {
        if (this.convertDestFile && this.exists(this.convertDestFile)) {
            fs.rmSync(this.convertDestFile);
        }

        this.finishConvert();
    }
}

const util = new Util();

export default util;
