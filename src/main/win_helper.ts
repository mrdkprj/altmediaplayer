import { BrowserWindow, nativeImage } from "electron";
import os from "os";
import { translation } from "../translation/translation";
import play from "../assets/play.png";
import pause from "../assets/pause.png";
import forward from "../assets/forward.png";
import backward from "../assets/backward.png";
import { getDefaultConfig, Menu, MenuItem, MenuItemConstructorOptions } from "node_wcpopup";

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

const ADD_TAG_MENU_Id = "addTag";

class Builder implements Mp.MenuBuilder<Menu> {
    private settings: Mp.Settings;
    private t: (key: keyof Mp.Labels) => string;

    constructor(settings: Mp.Settings) {
        this.settings = settings;
        this.t = translation(this.settings.locale.lang);
    }

    empty(): Menu {
        return new Menu();
    }

    async popup(menu: Menu, x: number, y: number): Promise<void> {
        await menu.popup(x, y);
    }

    changeTheme(menu: Menu, theme: Mp.Theme): void {
        menu.setTheme(theme);
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
                id: "light",
                label: this.t("light"),
                type: "radio",
                checked: this.settings.theme === "light",
                click: () => onClick(id, "light"),
            },
            {
                id: "dark",
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
                checked: this.settings.video.playbackSpeed == 0.25,
                click: () => onClick(id, 0.25),
            },
            {
                label: "0.5",
                type: "radio",
                checked: this.settings.video.playbackSpeed == 0.5,
                click: () => onClick(id, 0.5),
            },
            {
                label: "0.75",
                type: "radio",
                checked: this.settings.video.playbackSpeed == 0.75,
                click: () => onClick(id, 0.75),
            },
            {
                label: `1 - ${this.t("default")}`,
                type: "radio",
                checked: this.settings.video.playbackSpeed == 1,
                click: () => onClick(id, 1),
            },
            {
                label: "1.25",
                type: "radio",
                checked: this.settings.video.playbackSpeed == 1.25,
                click: () => onClick(id, 1.25),
            },
            {
                label: "1.5",
                type: "radio",
                checked: this.settings.video.playbackSpeed == 1.5,
                click: () => onClick(id, 1.5),
            },
            {
                label: "1.75",
                type: "radio",
                checked: this.settings.video.playbackSpeed == 1.75,
                click: () => onClick(id, 1.75),
            },
            {
                label: "2",
                type: "radio",
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
                checked: this.settings.video.seekSpeed == 0.03,
                click: () => onClick(id, 0.03),
            },
            {
                label: `0.05${this.t("second")}`,
                type: "radio",
                checked: this.settings.video.seekSpeed == 0.05,
                click: () => onClick(id, 0.05),
            },
            {
                label: `0.1${this.t("second")}`,
                type: "radio",
                checked: this.settings.video.seekSpeed == 0.1,
                click: () => onClick(id, 0.1),
            },
            {
                label: `0.5${this.t("second")}`,
                type: "radio",
                checked: this.settings.video.seekSpeed == 0.5,
                click: () => onClick(id, 0.5),
            },
            {
                label: `1${this.t("second")}`,
                type: "radio",
                checked: this.settings.video.seekSpeed == 1,
                click: () => onClick(id, 1),
            },
            {
                label: `3${this.t("second")}`,
                type: "radio",
                checked: this.settings.video.seekSpeed == 3,
                click: () => onClick(id, 3),
            },
            {
                label: `5${this.t("second")} - ${this.t("default")}`,
                type: `radio`,
                checked: this.settings.video.seekSpeed == 5,
                click: () => onClick(id, 5),
            },
            {
                label: `10${this.t("second")}`,
                type: "radio",
                checked: this.settings.video.seekSpeed == 10,
                click: () => onClick(id, 10),
            },
            {
                label: `20${this.t("second")}`,
                type: "radio",
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
                click: () => onClick(id, "NameAsc"),
            },
            {
                name: "sort",
                label: this.t("nameDesc"),
                type: "radio",
                checked: this.settings.sort.order === "NameDesc",
                click: () => onClick(id, "NameDesc"),
            },
            {
                name: "sort",
                label: this.t("dateAsc"),
                type: "radio",
                checked: this.settings.sort.order === "DateAsc",
                click: () => onClick(id, "DateAsc"),
            },
            {
                name: "sort",
                label: this.t("dateDesc"),
                type: "radio",
                checked: this.settings.sort.order === "DateDesc",
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

export { Builder };
