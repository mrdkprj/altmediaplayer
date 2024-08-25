import { BrowserWindow, nativeImage } from "electron";
import { fileURLToPath } from "url";
import path from "path";
import { translation } from "../translation/translation";
import icon from "../assets/icon.ico";
import play from "../assets/play.png";
import pause from "../assets/pause.png";
import forward from "../assets/forward.png";
import backward from "../assets/backward.png";
import { Menu } from "node_wcpopup";
import { Builder } from "./win_helper";

const isDev = process.env.NODE_ENV === "development";

const load = (window: BrowserWindow, name: RendererName) => {
    if (isDev) {
        return window.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/${name.toLowerCase()}/index.html`);
    }

    return window.loadFile(fileURLToPath(new URL(`../renderer/${name.toLowerCase()}/index.html`, import.meta.url)));
};

class Helper {
    private settings: Mp.Settings;
    private t: (key: keyof Mp.Labels) => string;
    private menuBuilder: Mp.MenuBuilder<any>;
    private menus: { [key in Mp.ContextMenuName]: Menu | Electron.Menu };

    constructor(settings: Mp.Settings) {
        this.settings = settings;
        this.t = translation(this.settings.locale.lang);
        this.menuBuilder = new Builder(this.settings);
        this.menus = {
            Player: this.menuBuilder.empty(),
            Playlist: this.menuBuilder.empty(),
            Sort: this.menuBuilder.empty(),
        };
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
                preload: path.join(fileURLToPath(new URL("../preload/preload.js", import.meta.url))),
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
                preload: path.join(fileURLToPath(new URL("../preload/preload.js", import.meta.url))),
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
                preload: path.join(fileURLToPath(new URL("../preload/preload.js", import.meta.url))),
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
                preload: path.join(fileURLToPath(new URL("../preload/preload.js", import.meta.url))),
            },
        });

        load(window, "Tag");

        return window;
    }

    async popup(name: Mp.ContextMenuName, x: number, y: number) {
        await this.menuBuilder.popup(this.menus[name], x, y);
    }

    changeTheme(theme: Mp.Theme) {
        Object.entries(this.menus).forEach(([_, menu]) => {
            this.menuBuilder.changeTheme(menu, theme);
        });
    }

    createPlayerContextMenu(name: Mp.ContextMenuName, window: BrowserWindow, onClick: Mp.PlayerContextMenuCallback<keyof Mp.PlayerContextMenuSubTypeMap>) {
        this.menus[name] = this.menuBuilder.createPlayerContextMenu(window, onClick);
    }

    createPlaylistContextMenu(name: Mp.ContextMenuName, window: BrowserWindow, onClick: Mp.PlaylistContextMenuCallback<keyof Mp.PlaylistContextMenuSubTypeMap>) {
        this.menus[name] = this.menuBuilder.createPlaylistContextMenu(window, onClick);
    }

    refreshTagContextMenu(tags: string[], onClick: Mp.PlaylistContextMenuCallback<"Tag">) {
        this.menuBuilder.refreshTagContextMenu(this.menus["Playlist"], tags, onClick);
    }

    createPlaylistSortContextMenu(name: Mp.ContextMenuName, window: BrowserWindow, onClick: Mp.PlaylistContextMenuCallback<"Sort" | "GroupBy">) {
        this.menus[name] = this.menuBuilder.createPlaylistSortContextMenu(window, onClick);
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

export { Helper };
