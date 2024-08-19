import { BrowserWindow, nativeImage } from "electron";
import path from "path";
import os from "os";
import { translation } from "../translation/translation";
import icon from "../assets/icon.ico";
import play from "../assets/play.png";
import pause from "../assets/pause.png";
import forward from "../assets/forward.png";
import backward from "../assets/backward.png";
import { getDefaultConfig, Menu, MenuItem, MenuItemConstructorOptions } from "node_wcpopup";

const isDev = process.env.NODE_ENV === "development";

const load = (window: BrowserWindow, name: RendererName) => {
    if (isDev) {
        return window.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/${name.toLowerCase()}/index.html`);
    }

    return window.loadFile(path.join(__dirname, `../renderer/${name.toLowerCase()}/index.html`));
};

const getHWND = (window: BrowserWindow) => {
    const hwndBuffer = window.getNativeWindowHandle();
    let hwnd;
    if (os.endianness() == "LE") {
        hwnd = hwndBuffer.readInt32LE();
    } else {
        hwnd = hwndBuffer.readInt32BE();
    }

    return hwnd;
};

const getMenuConfig = (setting: Mp.Settings) => {
    const config = getDefaultConfig();
    config.color.dark.color = 0xefefef;
    config.color.dark.backgroundColor = 0x202020;
    config.corner = "Round";
    config.theme = setting.theme == "dark" ? "dark" : "light";
    config.size.borderSize = 0;
    config.font.fontFamily = "Yu Gothic UI";
    config.font.darkFontWeight = "Normal";
    config.size.itemHorizontalPadding = 0;
    return config;
};

export const ADD_TAG_MENU_Id = "addTag";

export default class Helper {
    private settings: Mp.Settings;
    private t: (key: keyof Mp.Labels) => string;

    constructor(settings: Mp.Settings) {
        this.settings = settings;
        this.t = translation(this.settings.locale.lang);
    }

    createPlayerWindow() {
        const window = new BrowserWindow({
            width: this.settings.bounds.width,
            height: this.settings.bounds.height,
            x: this.settings.bounds.x,
            y: this.settings.bounds.y,
            autoHideMenuBar: true,
            show: false,
            icon: nativeImage.createFromDataURL(icon),
            frame: false,
            fullscreenable: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, "../preload/preload.js"),
            },
        });

        load(window, "Player");

        return window;
    }

    createPlaylistWindow(parent: BrowserWindow) {
        const window = new BrowserWindow({
            parent,
            width: this.settings.playlistBounds.width,
            height: this.settings.playlistBounds.height,
            x: this.settings.playlistBounds.x,
            y: this.settings.playlistBounds.y,
            autoHideMenuBar: true,
            show: false,
            frame: false,
            transparent: true,
            minimizable: false,
            maximizable: false,
            fullscreenable: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, "../preload/preload.js"),
            },
        });

        load(window, "Playlist");

        return window;
    }

    createConvertWindow(parent: BrowserWindow) {
        const window = new BrowserWindow({
            parent,
            width: 640,
            height: 700,
            resizable: true,
            autoHideMenuBar: true,
            show: false,
            frame: false,
            modal: true,
            minimizable: false,
            maximizable: false,
            fullscreenable: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, "../preload/preload.js"),
            },
        });

        load(window, "Convert");

        return window;
    }

    createTagEditorWindow(parent: BrowserWindow) {
        const window = new BrowserWindow({
            parent,
            width: 400,
            height: 600,
            minHeight: 250,
            resizable: true,
            autoHideMenuBar: true,
            show: false,
            frame: false,
            modal: false,
            minimizable: false,
            maximizable: false,
            fullscreenable: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, "../preload/preload.js"),
            },
        });

        load(window, "Tag");

        return window;
    }

    createPlayerContextMenu(window: BrowserWindow, onClick: Mp.PlayerContextMenuCallback<keyof Mp.PlayerContextMenuSubTypeMap>) {
        const template: MenuItemConstructorOptions[] = [
            {
                label: this.t("playbackSpeed"),
                submenu: this.playbackSpeedMenu(onClick),
            },
            {
                label: this.t("seekSpeed"),
                submenu: this.seekSpeedMenu(onClick),
            },
            {
                id: "FitToWindow",
                label: this.t("fitToWindow"),
                type: "checkbox",
                checked: this.settings.video.fitToWindow,
                click: () => onClick("FitToWindow"),
            },
            { type: "separator" },
            {
                label: this.t("playlist"),
                accelerator: "Ctrl+P",
                id: "TogglePlaylistWindow",
                click: () => onClick("TogglePlaylistWindow"),
            },
            {
                label: this.t("fullscreen"),
                accelerator: "F11",
                id: "ToggleFullscreen",
                click: () => onClick("ToggleFullscreen"),
            },
            {
                label: this.t("pip"),
                id: "PictureInPicture",
                click: () => onClick("PictureInPicture"),
            },
            { type: "separator" },
            {
                label: this.t("capture"),
                accelerator: "Ctrl+S",
                id: "Capture",
                click: () => onClick("Capture"),
            },
            { type: "separator" },
            {
                label: this.t("theme"),
                submenu: this.themeMenu(onClick),
            },
        ];

        const menu = new Menu();
        menu.buildFromTemplateWithConfig(getHWND(window), template, getMenuConfig(this.settings));
        return menu;
    }

    private themeMenu(onClick: Mp.PlayerContextMenuCallback<"Theme">) {
        const id = "Theme";
        const template: MenuItem[] = [
            {
                value: "light",
                label: this.t("light"),
                type: "radio",
                checked: this.settings.theme === "light",
                click: () => onClick(id, "light"),
            },
            {
                value: "dark",
                label: this.t("dark"),
                type: "radio",
                checked: this.settings.theme === "dark",
                click: () => onClick(id, "dark"),
            },
        ];

        return template;
    }

    private playbackSpeedMenu(onClick: Mp.PlayerContextMenuCallback<"PlaybackSpeed">) {
        const id = "PlaybackSpeed";
        const template: MenuItem[] = [
            {
                label: "0.25",
                type: "radio",
                value: 0.25,
                checked: this.settings.video.playbackSpeed == 0.25,
                click: () => onClick(id, 0.25),
            },
            {
                label: "0.5",
                type: "radio",
                value: 0.5,
                checked: this.settings.video.playbackSpeed == 0.5,
                click: () => onClick(id, 0.5),
            },
            {
                label: "0.75",
                type: "radio",
                value: 0.75,
                checked: this.settings.video.playbackSpeed == 0.75,
                click: () => onClick(id, 0.75),
            },
            {
                label: `1 - ${this.t("default")}`,
                type: "radio",
                value: 1,
                checked: this.settings.video.playbackSpeed == 1,
                click: () => onClick(id, 1),
            },
            {
                label: "1.25",
                type: "radio",
                value: 1.25,
                checked: this.settings.video.playbackSpeed == 1.25,
                click: () => onClick(id, 1.25),
            },
            {
                label: "1.5",
                type: "radio",
                value: 1.5,
                checked: this.settings.video.playbackSpeed == 1.5,
                click: () => onClick(id, 1.5),
            },
            {
                label: "1.75",
                type: "radio",
                value: 1.75,
                checked: this.settings.video.playbackSpeed == 1.75,
                click: () => onClick(id, 1.75),
            },
            {
                label: "2",
                type: "radio",
                value: 2,
                checked: this.settings.video.playbackSpeed == 2,
                click: () => onClick(id, 2),
            },
        ];

        return template;
    }

    private seekSpeedMenu(onClick: Mp.PlayerContextMenuCallback<"SeekSpeed">) {
        const id = "SeekSpeed";
        const template: MenuItem[] = [
            {
                label: `0.03${this.t("second")}`,
                type: "radio",
                value: 0.03,
                checked: this.settings.video.seekSpeed == 0.03,
                click: () => onClick(id, 0.03),
            },
            {
                label: `0.05${this.t("second")}`,
                type: "radio",
                value: 0.05,
                checked: this.settings.video.seekSpeed == 0.05,
                click: () => onClick(id, 0.05),
            },
            {
                label: `0.1${this.t("second")}`,
                type: "radio",
                value: 0.1,
                checked: this.settings.video.seekSpeed == 0.1,
                click: () => onClick(id, 0.1),
            },
            {
                label: `0.5${this.t("second")}`,
                type: "radio",
                value: 0.5,
                checked: this.settings.video.seekSpeed == 0.5,
                click: () => onClick(id, 0.5),
            },
            {
                label: `1${this.t("second")}`,
                type: "radio",
                value: 1,
                checked: this.settings.video.seekSpeed == 1,
                click: () => onClick(id, 1),
            },
            {
                label: `3${this.t("second")}`,
                type: "radio",
                value: 3,
                checked: this.settings.video.seekSpeed == 3,
                click: () => onClick(id, 3),
            },
            {
                label: `5${this.t("second")} - ${this.t("default")}`,
                type: `radio`,
                value: 5,
                checked: this.settings.video.seekSpeed == 5,
                click: () => onClick(id, 5),
            },
            {
                label: `10${this.t("second")}`,
                type: "radio",
                value: 10,
                checked: this.settings.video.seekSpeed == 10,
                click: () => onClick(id, 10),
            },
            {
                label: `20${this.t("second")}`,
                type: "radio",
                value: 20,
                checked: this.settings.video.seekSpeed == 20,
                click: () => onClick(id, 20),
            },
        ];

        return template;
    }

    createPlaylistContextMenu(window: BrowserWindow, onClick: Mp.PlaylistContextMenuCallback<keyof Mp.PlaylistContextMenuSubTypeMap>) {
        const template: MenuItemConstructorOptions[] = [
            {
                label: this.t("remove"),
                accelerator: "Delete",
                id: "Remove",
                click: () => onClick("Remove"),
            },
            {
                label: this.t("trash"),
                accelerator: "Shift+Delete",
                id: "Trash",
                click: () => onClick("Trash"),
            },
            { type: "separator" },
            {
                label: this.t("copyName"),
                accelerator: "Ctrl+C",
                id: "CopyFileName",
                click: () => onClick("CopyFileName"),
            },
            {
                label: this.t("copyFullpath"),
                accelerator: "Ctrl+Shift+C",
                id: "CopyFullpath",
                click: () => onClick("CopyFullpath"),
            },
            {
                label: this.t("reveal"),
                accelerator: "Ctrl+R",
                id: "Reveal",
                click: () => onClick("Reveal"),
            },
            { type: "separator" },
            {
                label: this.t("rename"),
                accelerator: "F2",
                id: "Rename",
                click: () => onClick("Rename"),
            },
            {
                label: this.t("metadata"),
                id: "Metadata",
                click: () => onClick("Metadata"),
            },
            {
                label: this.t("convert"),
                id: "Convert",
                click: () => onClick("Convert"),
            },
            { type: "separator" },
            {
                id: ADD_TAG_MENU_Id,
                label: this.t("tags"),
                submenu: this.createTagContextMenu(onClick),
            },
            {
                label: this.t("manageTag"),
                id: "ManageTags",
                click: () => onClick("ManageTags"),
            },
            { type: "separator" },
            {
                label: this.t("moveFile"),
                id: "Move",
                click: () => onClick("Move"),
            },
            { type: "separator" },
            {
                label: this.t("clearList"),
                id: "RemoveAll",
                click: () => onClick("RemoveAll"),
            },
        ];

        const menu = new Menu();
        menu.buildFromTemplateWithConfig(getHWND(window), template, getMenuConfig(this.settings));
        return menu;
    }

    private createTagContextMenu(onClick: Mp.PlaylistContextMenuCallback<"Tag">) {
        const template: MenuItem[] = this.settings.tags.sort().map((tag) => {
            return {
                id: tag,
                value: tag,
                label: tag,
                click: () => onClick("Tag", tag),
            };
        });
        return template;
    }

    refreshTagContextMenu(parent: Menu, tags: string[], onClick: Mp.PlaylistContextMenuCallback<"Tag">) {
        const menu = parent.getMenuItemById(ADD_TAG_MENU_Id);

        if (menu && menu.submenu) {
            const menuItemMap = menu.submenu.items().reduce((obj: { [key: string]: MenuItem }, item) => ((obj[item.id ?? ""] = item), obj), {});
            const keys = [...new Set([...tags, ...Object.keys(menuItemMap)])].sort();

            keys.forEach((key, index) => {
                if (menuItemMap[key] && !tags.includes(key)) {
                    menu.submenu?.remove(menuItemMap[key]);
                }

                if (!menuItemMap[key] && tags.includes(key)) {
                    const item: MenuItem = {
                        id: key,
                        label: key,
                        click: () => onClick("Tag", key),
                    };
                    menu.submenu?.insert(index, item);
                }
            });
        }
    }

    createPlaylistSortContextMenu(window: BrowserWindow, onClick: Mp.PlaylistContextMenuCallback<"Sort" | "GroupBy">) {
        const id = "Sort";
        const template: MenuItem[] = [
            {
                label: this.t("groupBy"),
                type: "checkbox",
                checked: this.settings.sort.groupBy,
                click: () => onClick("GroupBy"),
            },
            { type: "separator" },
            {
                name: "sort",
                label: this.t("nameAsc"),
                type: "radio",
                checked: this.settings.sort.order === "NameAsc",
                value: "NameAsc",
                click: () => onClick(id, "NameAsc"),
            },
            {
                name: "sort",
                label: this.t("nameDesc"),
                type: "radio",
                checked: this.settings.sort.order === "NameDesc",
                value: "NameDesc",
                click: () => onClick(id, "NameDesc"),
            },
            {
                name: "sort",
                label: this.t("dateAsc"),
                type: "radio",
                checked: this.settings.sort.order === "DateAsc",
                value: "DateAsc",
                click: () => onClick(id, "DateAsc"),
            },
            {
                name: "sort",
                label: this.t("dateDesc"),
                type: "radio",
                checked: this.settings.sort.order === "DateDesc",
                value: "DateDesc",
                click: () => onClick(id, "DateDesc"),
            },
        ];

        const menu = new Menu();
        menu.buildFromTemplateWithConfig(getHWND(window), template, getMenuConfig(this.settings));
        return menu;
    }

    getImage() {
        return nativeImage.createFromDataURL(play).toDataURL();
    }

    createThumButtons(onClick: (button: Mp.ThumbButtonType) => void) {
        const playThumbButton: Electron.ThumbarButton = {
            tooltip: this.t("play"),
            icon: nativeImage.createFromDataURL(play),
            click: () => onClick("Play"),
        };
        const pauseThumbButton: Electron.ThumbarButton = {
            tooltip: this.t("pause"),
            icon: nativeImage.createFromDataURL(pause),
            click: () => onClick("Pause"),
        };
        const prevThumbButton: Electron.ThumbarButton = {
            tooltip: this.t("previous"),
            icon: nativeImage.createFromDataURL(backward),
            click: () => onClick("Previous"),
        };
        const nextThumbButton: Electron.ThumbarButton = {
            tooltip: this.t("next"),
            icon: nativeImage.createFromDataURL(forward),
            click: () => onClick("Next"),
        };

        const thumbButtonsOptionsPaused: Electron.ThumbarButton[] = [prevThumbButton, playThumbButton, nextThumbButton];

        const thumbButtonsOptionsPlayed: Electron.ThumbarButton[] = [prevThumbButton, pauseThumbButton, nextThumbButton];

        return [thumbButtonsOptionsPaused, thumbButtonsOptionsPlayed];
    }
}
