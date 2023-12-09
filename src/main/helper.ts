import { BrowserWindow, Menu, nativeImage } from "electron"
import path from "path"
import { translation } from "../translation/translation";

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
            icon: path.join(__dirname, "..", "static", "img", "icon.ico"),
            frame: false,
            fullscreenable:true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: PLAYER_WINDOW_PRELOAD_WEBPACK_ENTRY,
            },
        });

        window.loadURL(PLAYER_WINDOW_WEBPACK_ENTRY);

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
                preload: PLAYLIST_WINDOW_PRELOAD_WEBPACK_ENTRY,
            },
        })

        window.loadURL(PLAYLIST_WINDOW_WEBPACK_ENTRY);

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
                preload: CONVERT_WINDOW_PRELOAD_WEBPACK_ENTRY
            },
        })

        window.loadURL(CONVERT_WINDOW_WEBPACK_ENTRY);

        return window;
    }

    createPlayerContextMenu(onclick: (menu:Mp.PlayerContextMenuType, args?:any) => void){

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

    private themeMenu(onclick: (menu:Mp.PlayerContextMenuType, args?:Mp.ContextMenuSubType) => void){
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

    private playbackSpeedMenu(onclick: (menu:Mp.PlayerContextMenuType, args?:Mp.ContextMenuSubType) => void){

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

    private seekSpeedMenu(onclick: (menu:Mp.PlayerContextMenuType, args?:Mp.ContextMenuSubType) => void){

        const type = "SeekSpeed"
        const template:Electron.MenuItemConstructorOptions[] = [
            {
                id: "seekspeed0",
                label:`0.03sec`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 0.03))
            },
            {
                id: "seekspeed1",
                label:`0.05sec`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 0.05))
            },
            {
                id: "seekspeed2",
                label:`0.1sec`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 0.1))
            },
            {
                id: "seekspeed3",
                label:`0.5sec`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 0.5))
            },
            {
                id: "seekspeed4",
                label:`1sec`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 1))
            },
            {
                id: "seekspeed5",
                label:`5sec - Default`,
                type:`checkbox`,
                checked:true,
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 5))
            },
            {
                id: "seekspeed6",
                label:`10sec`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 10))
            },
            {
                id: "seekspeed7",
                label:`20sec`,
                type:"checkbox",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, 20))
            },
        ]

        return Menu.buildFromTemplate(template);
    }

    createPlaylistContextMenu(onclick: (menu:Mp.PlaylistContextMenuType, args?:Mp.ContextMenuSubType) => void){

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

    createPlaylistSortContextMenu(onclick: (menu:Mp.PlaylistContextMenuType, args?:Mp.ContextMenuSubType) => void){

        const type = "Sort"
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
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type, "NameAsc"))
            },
            {
                id: "NameDesc",
                label: this.t("nameDesc"),
                type: "checkbox",
                checked: this.config.sort.order === "NameDesc",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type,"NameDesc"))
            },
            {
                id: "DateAsc",
                label: this.t("dateAsc"),
                type: "checkbox",
                checked: this.config.sort.order === "DateAsc",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type,"DateAsc"))
            },
            {
                id: "DateDesc",
                label: this.t("dateDesc"),
                type: "checkbox",
                checked: this.config.sort.order === "DateDesc",
                click: (menuItem) => this.toggleMenuItemCheckbox(menuItem, () => onclick(type,"DateDesc"))
            },
        ]

        return Menu.buildFromTemplate(template);
    }

    createThumButtons(onclick: (button:Mp.ThumbButtonType) => void){

        const staticDir = path.join(__dirname, "..", "static");

        const playThumbButton:Electron.ThumbarButton = {
            tooltip: this.t("play"),
            icon: nativeImage.createFromPath(path.join(staticDir, "img", "play.png")),
            click: () => onclick("Play"),
        }
        const pauseThumbButton:Electron.ThumbarButton = {
            tooltip: this.t("pause"),
            icon: nativeImage.createFromPath(path.join(staticDir, "img", "pause.png")),
            click: () => onclick("Pause"),
        }
        const prevThumbButton:Electron.ThumbarButton = {
            tooltip: this.t("previous"),
            icon: nativeImage.createFromPath(path.join(staticDir, "img", "backward.png")),
            click: () => onclick("Previous")
        }
        const nextThumbButton:Electron.ThumbarButton = {
            tooltip: this.t("next"),
            icon: nativeImage.createFromPath(path.join(staticDir, "img", "forward.png")),
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

    private toggleMenuItemCheckbox(menuItem:Electron.MenuItem, onclick:() => void){

        menuItem.menu.items.forEach((item:Electron.MenuItem) => {
            if(item.id === menuItem.id){
                item.checked = true;
            }else{
                item.checked = false;
            }
        })

        onclick()
    }

}