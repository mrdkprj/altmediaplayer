import fs from "fs";
import path from "path";
import util from "./util";

const SETTING_FILE_NAME = "altmediaplayer.settings.json";

const defaultSettings: Mp.Settings = {
    bounds: { width: 1200, height: 800, x: 0, y: 0 },
    playlistBounds: { width: 400, height: 700, x: 0, y: 0 },
    isMaximized: false,
    playlistVisible: true,
    theme: "dark",
    sort: {
        order: "NameAsc",
        groupBy: false,
    },
    video: {
        playbackSpeed: 1,
        seekSpeed: 10,
        fitToWindow: true,
    },
    audio: {
        volume: 1,
        ampLevel: 0.07,
        mute: false,
    },
    defaultPath: "",
    locale: {
        mode: "en",
        lang: "en",
    },
    tags: [],
};

export default class Settings {
    data = defaultSettings;

    private file: string;
    private tempPath: string;

    constructor(userDataPath: string, langs: string[]) {
        this.tempPath = process.env.NODE_ENV === "development" ? path.join(__dirname, "..", "..", "temp") : path.join(userDataPath, "temp");
        util.exists(this.tempPath, true);
        this.file = path.join(this.tempPath, SETTING_FILE_NAME);
        this.init();
        this.setLanguage(langs);
    }

    private setLanguage(langs: string[]) {
        if (this.data.locale.mode == "system") {
            if (langs[0].includes("ja")) {
                this.data.locale.lang = "ja";
            } else {
                this.data.locale.lang = "en";
            }
        } else {
            this.data.locale.lang = this.data.locale.mode;
        }
    }

    private init() {
        const fileExists = util.exists(this.file, false);

        if (fileExists) {
            const rawData = fs.readFileSync(this.file, { encoding: "utf8" });
            this.data = this.createSettings(JSON.parse(rawData));
        } else {
            fs.writeFileSync(this.file, JSON.stringify(this.data));
        }
    }

    private createSettings(rawSettings: any): Mp.Settings {
        const config = { ...defaultSettings } as any;

        Object.keys(rawSettings).forEach((key) => {
            if (!(key in config)) return;

            const value = rawSettings[key];

            if (typeof value === "object" && !Array.isArray(value)) {
                Object.keys(value).forEach((valueKey) => {
                    if (valueKey in config[key]) {
                        config[key][valueKey] = value[valueKey];
                    }
                });
            } else {
                config[key] = value;
            }
        });

        return config;
    }

    getFilePath() {
        return this.file;
    }

    save() {
        fs.writeFileSync(this.file, JSON.stringify(this.data));
    }
}
