import path from "path"
import { BrowserWindow, dialog } from "electron"
import { AudioFormats, VideoFormats } from "../constants";
import { translation } from "../translation/translation";

export default class Dialogs{

    private settings:Mp.Settings;
    private t:(key:keyof Mp.Labels) => string;

    constructor(settings:Mp.Settings){
        this.settings = settings
        this.t = translation(this.settings.locale.lang)
    }

    async showErrorMessage(ex:any){
        await dialog.showMessageBox({type:"error", message:ex.message})
    }

    openConvertSourceFileDialog(window:BrowserWindow, fullPath:string){

        return dialog.showOpenDialogSync(window, {
            title: this.t("selectConvertInputFile"),
            defaultPath: fullPath,
            filters: [
                { name: this.t("mediaFile"), extensions: VideoFormats.concat(AudioFormats) },
            ],
            properties: ["openFile", "multiSelections"]
        })
    }

    saveImageDialog(window:BrowserWindow, file:Mp.MediaFile, timestamp:number){

        return dialog.showSaveDialogSync(window, {
            defaultPath: path.join(this.settings.defaultPath, `${file.name}-${timestamp}.jpeg`),
            filters: [
                { name: "Image", extensions: ["jpeg", "jpg"] },
            ],
        })
    }

    saveMediaDialog(window:BrowserWindow, fileName:string, extension:string, convertFormat:Mp.ConvertFormat){

        return dialog.showSaveDialogSync(window, {
            defaultPath: path.join(this.settings.defaultPath, `${fileName}.${extension}`),
            filters: [
                {
                    name:convertFormat === "MP4" ? "Video" : "Audio",
                    extensions: [extension]
                },
            ],
        })
    }

    async metadataDialog(window:BrowserWindow, metadata:string){
        return await dialog.showMessageBox(window, {type:"info", message:metadata,  buttons:["Copy", "OK"], noLink:true})
    }

    openPlaylistDialog(window:BrowserWindow){
        return dialog.showOpenDialogSync(window, {
            title: this.t("selectPlaylistFile"),
            defaultPath: this.settings.defaultPath,
            filters: [
                { name: this.t("playlistFile"), extensions: ["json"] },
            ],
            properties: ["openFile"]
        })
    }

    savePlaylistDialog(window:BrowserWindow){
        return dialog.showSaveDialogSync(window, {
            defaultPath: this.settings.defaultPath,
            filters: [
                { name: this.t("playlistFile"), extensions: ["json"] },
            ],
        })
    }
}
