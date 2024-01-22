import { BrowserWindow, Menu, MenuItem, nativeImage } from "electron"
import path from "path"
import { translation } from "../translation/translation";
import icon from "../assets/icon.ico"
import play from "../assets/play.png"
import pause from "../assets/pause.png"
import forward from "../assets/forward.png"
import backward from "../assets/backward.png"
import util from "./util";

const isDev = process.env.NODE_ENV === "development"

const load = (window:BrowserWindow, name:RendererName) => {

    if(isDev){
        return window.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/${name.toLowerCase()}/index.html`)
    }

    return window.loadFile(path.join(__dirname, `../renderer/${name.toLowerCase()}/index.html`))

}

export const ADD_TAG_MENU_Id = "addTag"

export default class Helper{

    config:Mp.Config;
    t:(key:keyof Mp.label) => string;

    constructor(config:Mp.Config){
        this.config = config;
        this.t = translation(this.config.lang)
    }

    createPlayerWindow(){

        const window = new BrowserWindow({
            width: this.config.bounds.width,
            height: this.config.bounds.height,
            x:this.config.bounds.x,
            y:this.config.bounds.y,
            autoHideMenuBar: true,
            show: false,
            icon: nativeImage.createFromDataURL(icon),
            frame: false,
            fullscreenable:true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, "../preload/preload.js"),
            },
        });

        load(window, "Player")

        return window

    }

    createPlaylistWindow(parent:BrowserWindow){

        const window = new BrowserWindow({
            parent,
            width: this.config.playlistBounds.width,
            height: this.config.playlistBounds.height,
            x:this.config.playlistBounds.x,
            y:this.config.playlistBounds.y,
            autoHideMenuBar: true,
            show: false,
            frame:false,
            transparent:true,
            minimizable: false,
            maximizable: false,
            fullscreenable:false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, "../preload/preload.js"),
            },
        })

        load(window, "Playlist")

        return window;
    }

    createConvertWindow(parent:BrowserWindow){

        const window = new BrowserWindow({
            parent,
            width:640,
            height:700,
            resizable: true,
            autoHideMenuBar: true,
            show: false,
            frame:false,
            modal:true,
            minimizable: false,
            maximizable: false,
            fullscreenable:false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, "../preload/preload.js"),
            },
        })

        load(window, "Convert")

        return window;
    }

    createTagEditorWindow(parent:BrowserWindow){

        const window = new BrowserWindow({
            parent,
            width:400,
            height:600,
            minHeight: 250,
            resizable: true,
            autoHideMenuBar: true,
            show: false,
            frame:false,
            modal:false,
            minimizable: false,
            maximizable: false,
            fullscreenable:false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, "../preload/preload.js"),
            },
        })

        load(window, "Tag")

        return window;
    }

    createPlayerContextMenu(onclick: Mp.PlayerContextMenuCallback<keyof Mp.PlayerContextMenuSubTypeMap>){

        const template:Electron.MenuItemConstructorOptions[] = [
            {
                label: this.t("playbackSpeed"),
                submenu: this.playbackSpeedMenu(onclick)
            },
            {
                label: this.t("seekSpeed"),
                submenu: this.seekSpeedMenu(onclick)
            },
            {
                label: this.t("fitToWindow"),
                type: "checkbox",
                checked: this.config.video.fitToWindow,
                click: () => onclick("FitToWindow"),
            },
            { type: "separator" },
            {
                label: this.t("playlist"),
                accelerator: "CmdOrCtrl+P",
                click: () => onclick("TogglePlaylistWindow")
            },
            {
                label: this.t("fullscreen"),
                accelerator:"F11",
                click: () => onclick("ToggleFullscreen"),
            },
            {
                label: this.t("pip"),
                click: () => onclick("PictureInPicture"),
            },
            { type: "separator" },
            {
                label: this.t("capture"),
                accelerator: "CmdOrCtrl+S",
                click: () => onclick("Capture"),
            },
            { type: "separator" },
            {
                label: this.t("theme"),
                submenu:this.themeMenu(onclick)
            },

        ]

        return Menu.buildFromTemplate(template)
    }

    private themeMenu(onclick: Mp.PlayerContextMenuCallback<"Theme">){
        const type = "Theme"
        const template:Electron.MenuItemConstructorOptions[] = [
            {
                id: "themeLight",
                label: this.t("light"),
                type:"checkbox",
                checked: this.config.theme === "light",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, "light"))
            },
            {
                id: "themeDark",
                label: this.t("dark"),
                type:"checkbox",
                checked: this.config.theme === "dark",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, "dark"))
            },
        ]

        return Menu.buildFromTemplate(template);
    }

    private playbackSpeedMenu(onclick: Mp.PlayerContextMenuCallback<"PlaybackSpeed">){

        const type = "PlaybackSpeed"
        const template:Electron.MenuItemConstructorOptions[] = [
            {
                id: "playbackrate0",
                label:"0.25",
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 0.25))
            },
            {
                id: "playbackrate1",
                label:"0.5",
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 0.5))
            },
            {
                id: "playbackrate2",
                label:"0.75",
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 0.75))
            },
            {
                id: "playbackrate3",
                label:`1 - ${this.t("default")}`,
                type:"checkbox",
                checked:true,
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 1))
            },
            {
                id: "playbackrate4",
                label:"1.25",
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 1.25))
            },
            {
                id: "playbackrate5",
                label:"1.5",
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 1.5))
            },
            {
                id: "playbackrate6",
                label:"1.75",
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 1.75))
            },
            {
                id: "playbackrate7",
                label:"2",
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 2))
            },
        ]

        return Menu.buildFromTemplate(template);
    }

    private seekSpeedMenu(onclick: Mp.PlayerContextMenuCallback<"SeekSpeed">){

        const type = "SeekSpeed"
        const template:Electron.MenuItemConstructorOptions[] = [
            {
                id: "seekspeed0",
                label:`0.03${this.t("second")}`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 0.03))
            },
            {
                id: "seekspeed1",
                label:`0.05${this.t("second")}`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 0.05))
            },
            {
                id: "seekspeed2",
                label:`0.1${this.t("second")}`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 0.1))
            },
            {
                id: "seekspeed3",
                label:`0.5${this.t("second")}`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 0.5))
            },
            {
                id: "seekspeed4",
                label:`1${this.t("second")}`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 1))
            },
            {
                id: "seekspeed5",
                label:`3${this.t("second")}`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 3))
            },
            {
                id: "seekspeed6",
                label:`5${this.t("second")} - ${this.t("default")}`,
                type:`checkbox`,
                checked:true,
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 5))
            },
            {
                id: "seekspeed7",
                label:`10${this.t("second")}`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 10))
            },
            {
                id: "seekspeed8",
                label:`20${this.t("second")}`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 20))
            },
        ]

        return Menu.buildFromTemplate(template);
    }

    createPlaylistContextMenu(onclick: Mp.PlaylistContextMenuCallback<keyof Mp.PlaylistContextMenuSubTypeMap>){

        const template:Electron.MenuItemConstructorOptions[] = [
            {
                label: this.t("remove"),
                accelerator: "Delete",
                click: () => onclick("Remove")
            },
            {
                label: this.t("trash"),
                accelerator: "Shift+Delete",
                click: () => onclick("Trash")
            },
            { type: "separator" },
            {
                label: this.t("copyName"),
                accelerator: "CmdOrCtrl+C",
                click: () => onclick("CopyFileName")
            },
            {
                label: this.t("copyFullpath"),
                accelerator: "CmdOrCtrl+Shift+C",
                click: () => onclick("CopyFullpath")
            },
            {
                label: this.t("reveal"),
                accelerator: "CmdOrCtrl+R",
                click: () => onclick("Reveal")
            },
            { type: "separator" },
            {
                label: this.t("rename"),
                accelerator: "F2",
                click: () => onclick("Rename")
            },
            {
                label: this.t("metadata"),
                click: () => onclick("Metadata")
            },
            {
                label: this.t("convert"),
                click: () => onclick("Convert")
            },
            { type: "separator" },
            {
                id:ADD_TAG_MENU_Id,
                label: this.t("tags"),
                submenu:this.createTagContextMenu(onclick)
            },
            {
                label: this.t("manageTag"),
                click: () => onclick("ManageTags")
            },
            { type: "separator" },
            {
                label: this.t("loadList"),
                click: () => onclick("LoadList")
            },
            {
                label: this.t("saveList"),
                click: () => onclick("SaveList")
            },
            { type: "separator" },
            {
                label: this.t("clearList"),
                click: () => onclick("RemoveAll")
            },
        ]

        return Menu.buildFromTemplate(template);
    }

    private createTagContextMenu(onclick: Mp.PlaylistContextMenuCallback<"Tag">){
        const template:Electron.MenuItemConstructorOptions[] = this.config.tags.sort().map(tag => {
                return {
                    id:tag,
                    label: tag,
                    type:"checkbox",
                    click: () => onclick("Tag", tag)
                }
        })
        return Menu.buildFromTemplate(template);
    }

    refreshTagContextMenu(parent:Electron.Menu, tags:string[], onclick: Mp.PlaylistContextMenuCallback<"Tag">){

        const menu = parent.getMenuItemById(ADD_TAG_MENU_Id);

        if(menu && menu.submenu){
            const menuItemMap = menu.submenu.items.reduce((obj:{[key:string]:Electron.MenuItem}, item) => (obj[item.id] = item, obj), {})
            const keys = [...new Set([...tags,...Object.keys(menuItemMap)])].sort()

            keys.forEach((key,index) => {

                if(menuItemMap[key] && tags.includes(key)){
                    menuItemMap[key].enabled = true;
                }

                if(menuItemMap[key] && !tags.includes(key)){
                    menuItemMap[key].enabled = false;
                }

                if(!menuItemMap[key] && tags.includes(key)){
                    const item = new MenuItem({
                        id:key,
                        label: key,
                        type:"checkbox",
                        click: () => onclick("Tag", key)
                    })
                    menu.submenu?.insert(index, item)
                }

            })

        }

    }

    toggleTagContextMenu(parent:Electron.Menu, enable:boolean, selectedFile:Mp.MediaFile | undefined){

        const menu = parent.getMenuItemById(ADD_TAG_MENU_Id);

        if(menu){

            menu.enabled = enable

            if(!selectedFile) return

            const tag = util.getTag(selectedFile.fullPath)

            menu.submenu?.items.forEach(menu => {

                if(menu.id == tag){
                    menu.checked = true;
                }else{
                    menu.checked = false;
                }
            })

        }
    }

    createPlaylistSortContextMenu(onclick: Mp.PlaylistContextMenuCallback<"Sort" | "GroupBy">){

        const type = "Sort"
        const toggleExcepts = ["groupby"]
        const template:Electron.MenuItemConstructorOptions[] = [
            {
                id:"groupby",
                label: this.t("groupBy"),
                type: "checkbox",
                checked: this.config.sort.groupBy,
                click: () => onclick("GroupBy")
            },
            { type: "separator" },
            {
                id: "NameAsc",
                label: this.t("nameAsc"),
                type: "checkbox",
                checked: this.config.sort.order === "NameAsc",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, "NameAsc"), toggleExcepts)
            },
            {
                id: "NameDesc",
                label: this.t("nameDesc"),
                type: "checkbox",
                checked: this.config.sort.order === "NameDesc",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type,"NameDesc"), toggleExcepts)
            },
            {
                id: "DateAsc",
                label: this.t("dateAsc"),
                type: "checkbox",
                checked: this.config.sort.order === "DateAsc",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type,"DateAsc"), toggleExcepts)
            },
            {
                id: "DateDesc",
                label: this.t("dateDesc"),
                type: "checkbox",
                checked: this.config.sort.order === "DateDesc",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type,"DateDesc"), toggleExcepts)
            },
        ]

        return Menu.buildFromTemplate(template);
    }

    createThumButtons(onclick: (button:Mp.ThumbButtonType) => void){

        const playThumbButton:Electron.ThumbarButton = {
            tooltip: this.t("play"),
            icon: nativeImage.createFromDataURL(play),
            click: () => onclick("Play"),
        }
        const pauseThumbButton:Electron.ThumbarButton = {
            tooltip: this.t("pause"),
            icon: nativeImage.createFromDataURL(pause),
            click: () => onclick("Pause"),
        }
        const prevThumbButton:Electron.ThumbarButton = {
            tooltip: this.t("previous"),
            icon: nativeImage.createFromDataURL(backward),
            click: () => onclick("Previous")
        }
        const nextThumbButton:Electron.ThumbarButton = {
            tooltip: this.t("next"),
            icon: nativeImage.createFromDataURL(forward),
            click: () => onclick("Next")
        }

        const thumbButtonsOptionsPaused:Electron.ThumbarButton[] = [
            prevThumbButton,
            playThumbButton,
            nextThumbButton
        ]

        const thumbButtonsOptionsPlayed:Electron.ThumbarButton[] = [
            prevThumbButton,
            pauseThumbButton,
            nextThumbButton
        ]

        return [
            thumbButtonsOptionsPaused,
            thumbButtonsOptionsPlayed
        ]
    }

    private toggleMenuItemCheckbox(menuItem:Electron.MenuItem, onclick:() => void, excepts?:string[]){

        menuItem.menu.items.forEach((item:Electron.MenuItem) => {

            if(excepts && excepts.includes(item.id)){
                return;
            }

            if(item.id === menuItem.id){
                item.checked = true;
            }else{
                item.checked = false;
            }

        })

        onclick()
    }

}