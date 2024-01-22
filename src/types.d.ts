import ffmpeg from "fluent-ffmpeg"

declare global {

    interface Window {
        api: Api;
    }

    type RendererName = "Player" | "Playlist" | "Convert" | "Tag"
    type Renderer = {[key in RendererName] : Electron.BrowserWindow | null}

    type MainChannelEventMap = {
        "minimize": Mp.Event;
        "toggle-maximize": Mp.Event;
        "close": Mp.CloseRequest;
        "shortcut": Mp.ShortcutEvent;
        "drop": Mp.DropRequest;
        "load-file": Mp.LoadFileRequest;
        "progress": Mp.ProgressEvent;
        "open-player-context": Mp.Event;
        "play-status-change": Mp.ChangePlayStatusRequest;
        "reload": Mp.Event;
        "save-capture": Mp.CaptureEvent;
        "close-playlist": Mp.Event;
        "trash-ready": Mp.TrashRequest;
        "open-playlist-context": Mp.Event;
        "change-playlist-order": Mp.ChangePlaylistOrderRequet;
        "toggle-play": Mp.Event;
        "toggle-shuffle": Mp.Event;
        "toggle-fullscreen": Mp.FullscreenChange;
        "close-convert": Mp.Event;
        "request-convert": Mp.ConvertRequest;
        "open-convert-sourcefile-dialog": Mp.OpenFileDialogRequest;
        "request-cancel-convert": Mp.Event;
        "rename-file": Mp.RenameRequest;
        "rename-ready": Mp.RenameRequest;
        "playlist-item-selection-change": Mp.PlaylistItemSelectionChange;
        "open-sort-context": Mp.Position;
        "close-tag": Mp.Event;
        "save-tags": Mp.SaveTagsEvent;
        "error": Mp.ErrorEvent;
    }

    type RendererChannelEventMap = {
        "ready": Mp.ReadyEvent;
        "load-file": Mp.FileLoadEvent;
        "toggle-play": Mp.Event;
        "toggle-fullscreen": Mp.Event;
        "change-display-mode": Mp.ConfigChangeEvent;
        "capture-media": Mp.Event;
        "restart": Mp.Event;
        "before-trash": Mp.TrashRequest;
        "before-rename": Mp.RenameRequest;
        "log": Mp.Logging;
        "after-toggle-maximize": Mp.ConfigChangeEvent;
        "toggle-convert": Mp.Event;
        "change-playback-speed": Mp.ChangePlaybackSpeedRequest;
        "change-seek-speed": Mp.ChangeSeekSpeedRequest;
        "playlist-change": Mp.PlaylistChangeEvent;
        "after-remove-playlist": Mp.RemovePlaylistItemResult;
        "clear-playlist": Mp.Event;
        "sort-type-change": Mp.SortType;
        "start-rename":Mp.Event;
        "after-rename": Mp.RenameResult;
        "after-sourcefile-select": Mp.FileSelectResult;
        "open-convert": Mp.OpenConvertDialogEvent;
        "after-convert": Mp.Event;
        "picture-in-picture":Mp.Event;
        "open-tag-editor":Mp.OpenTagEditorEvent;
    }

    interface Api {
        send: <K extends keyof MainChannelEventMap>(channel: K, data:MainChannelEventMap[K]) => void;
        receive: <K extends keyof RendererChannelEventMap>(channel:K, listener: (data: RendererChannelEventMap[K]) => void) => void;
        removeAllListeners: <K extends keyof RendererChannelEventMap>(channel:K) => void;
    }

    namespace Mp {

        type Lang = "en" | "ja";
        type Theme = "dark" | "light";
        type ConvertFormat = "MP4" | "MP3"
        type ThumbButtonType = "Play" | "Pause" | "Previous" | "Next"
        type PlaybackSpeed = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;
        type SeekSpeed = 0.03 | 0.05 | 0.1 | 0.5 | 1 | 3 | 5 | 10 | 20;
        type SortOrder = "NameAsc" | "NameDesc" | "DateAsc" | "DateDesc"
        type FileDialogType = "Read" | "Write";

        type PlayerContextMenuSubTypeMap = {
            "PlaybackSpeed": Mp.PlaybackSpeed;
            "SeekSpeed": Mp.SeekSpeed;
            "TogglePlaylistWindow": null;
            "FitToWindow": null;
            "ToggleFullscreen": null;
            "Theme": Mp.Theme;
            "Capture": null;
            "PictureInPicture": null;
        }

        type PlaylistContextMenuSubTypeMap = {
            "Remove": null;
            "RemoveAll": null;
            "Trash": null;
            "CopyFileName": null;
            "CopyFullpath": null;
            "Reveal": null;
            "Metadata": null;
            "Convert": null;
            "Tag": string;
            "ManageTags":null;
            "Sort": Mp.SortOrder;
            "Rename": null;
            "LoadList": FileDialogType;
            "SaveList": FileDialogType;
            "GroupBy": null;
        };

        type PlayerContextMenuCallback<K extends keyof PlayerContextMenuSubTypeMap> = (menu:K, args?:Mp.PlayerContextMenuSubTypeMap[K]) => void
        type PlaylistContextMenuCallback<K extends keyof PlaylistContextMenuSubTypeMap> = (menu:K, args?:Mp.PlaylistContextMenuSubTypeMap[K]) => void

        type VideoFrameSize = "SizeNone" | "360p" | "480p" | "720p" | "1080p";
        type VideoRotation = "RotationNone" | "90Clockwise" | "90CounterClockwise"
        type AudioBitrate = "BitrateNone" | "128" | "160" | "192" | "320"

        type PlayStatus = "playing" | "paused" | "stopped"

        type SecondInstanceState = {
            timeout:NodeJS.Timeout | null;
            requireInitPlaylist:boolean;
        }

        type ShortcutEvent = {
            renderer:RendererName;
            menu: keyof PlayerContextMenuSubTypeMap | keyof PlaylistContextMenuSubTypeMap
        }

        type Bounds = {
            width:number;
            height:number;
            x:number;
            y:number;
        }

        type Position ={
            x:number;
            y:number;
        }

        type SortType = {
            order:SortOrder;
            groupBy:boolean;
        }

        type Config = {
            bounds: Bounds;
            playlistBounds:Bounds;
            theme: Mp.Theme;
            isMaximized:boolean;
            playlistVisible:boolean;
            sort:Mp.SortType;
            video:{
                fitToWindow:boolean;
                playbackSpeed:number;
                seekSpeed:number;
            };
            audio:{
                volume:number;
                ampLevel:number;
                mute:boolean;
            };
            path:{
                captureDestDir:string;
                convertDestDir:string;
                playlistDestDir:string;
            },
            lang:Mp.Lang;
            tags:string[];
        }

        type MediaFile = {
            id:string;
            fullPath:string;
            dir:string;
            src:string;
            name:string;
            date:number;
            extension:string;
            tag:string | undefined;
        }

        type MediaState = {
            mute: boolean;
            fitToWindow: boolean;
            currentTime:number;
            videoDuration: number;
            videoVolume: number;
            ampLevel: number;
            gainNode: GainNode | null;
            playbackSpeed:number;
            seekSpeed:number;
        }

        interface FfprobeData extends ffmpeg.FfprobeData {
            volume?:MediaVolume
        }

        type MediaVolume = {
            n_samples:string;
            mean_volume:string;
            max_volume:string;
        }

        type PlaylistItemSelection = {
            selectedId:string;
            selectedIds:string[];
        }

        type PlaylistDragState = {
            dragging: boolean;
            startElement:HTMLElement | null;
            targetElement:HTMLElement | null;
            startIndex: number;
        }

        type RenameData = {
            fileId:string;
            oldName:string;
            newName:string;
        }

        type ConvertOptions = {
            frameSize:VideoFrameSize;
            audioBitrate:AudioBitrate;
            rotation:VideoRotation;
            audioVolume:string;
            maxAudioVolume:boolean;
        }

        type ReadyEvent = {
            config:Config;
        }

        type FullscreenChange = {
            fullscreen:boolean;
        }

        type ChangePlaybackSpeedRequest = {
            playbackSpeed:number;
        }

        type ChangeSeekSpeedRequest = {
            seekSpeed:number;
        }

        type DropRequest = {
            files:string[];
            renderer:RendererName;
        }

        type PlaylistChangeEvent = {
            files:MediaFile[];
            type:PlaylistChangeEventType;
        }

        type ChangePlaylistOrderRequet = {
            start:number;
            end:number;
            currentIndex:number;
            type:PlaylistChangeEventType
        }

        type ProgressEvent = {
            progress:number;
        }

        type LoadFileRequest = {
            index:number;
            isAbsolute:boolean;
        }

        type ChangePlayStatusRequest = {
            status:PlayStatus;
        }

        type FileLoadEvent = {
            currentFile:MediaFile;
            autoPlay:boolean;
            startFrom?:number;
        }

        type ReplaceFileRequest = {
            file:MediaFile;
        }

        type CaptureEvent = {
            data:string;
            timestamp:number;
        }

        type CloseRequest = {
            mediaState:MediaState
        }

        type PlaylistItemSelectionChange = {
            selection:PlaylistItemSelection
        }

        type RemovePlaylistItemRequest = {
            selectedIds:string[]
        }

        type TrashPlaylistItemRequest = {
            selectedIds:string[]
        }

        type RemovePlaylistItemResult = {
            files:Mp.MediaFile[]
        }

        type TrashRequest = {
            fileIds:string[];
        }

        type CopyRequest = {
            fullpath:boolean;
        }

        type RenameRequest = {
            id:string;
            name:string;
            currentTime?:number;
        }

        type RenameResult = {
            file:MediaFile;
            error?:boolean;
        }

        type OpenTagEditorEvent = {
            tags:string[];
        }

        type SaveTagsEvent = {
            tags:string[];
        }

        type OpenConvertDialogEvent = {
            file:MediaFile;
        }

        type ConvertRequest = {
            sourcePath:string;
            convertFormat:ConvertFormat;
            options:ConvertOptions;
        }

        type FileSelectResult = {
            file:MediaFile;
        }

        type ConfigChangeEvent = {
            config:Config;
        }

        type OpenFileDialogRequest = {
            fullPath:string;
        }

        type ErrorEvent = {
            message:string;
        }

        type Event = {
            args?:any;
        }

        type Logging = {
            log:any;
        }

        type RadioGroupChangeEvent<T> = {
            value:T;
        }

        type label = {
            shuffle:string;
            sort:string;
            playbackSpeed:string;
            seekSpeed:string;
            fitToWindow:string;
            playlist:string;
            fullscreen:string;
            pip:string;
            capture:string;
            theme:string;
            light:string;
            dark:string;
            lang:string;
            default:string;
            second:string;
            remove:string;
            trash:string;
            copyName:string;
            copyFullpath:string;
            reveal:string;
            rename:string;
            metadata:string;
            convert:string;
            loadList:string;
            saveList:string;
            clearList:string;
            groupBy:string;
            nameAsc:string;
            nameDesc:string;
            dateAsc:string;
            dateDesc:string;
            play:string;
            pause:string;
            previous:string;
            next:string;
            inputFile:string;
            convertFormat:string;
            frameSize:string;
            videoRotation:string;
            audioBitrate:string;
            volume:string;
            maximizeVolue:string;
            start:string;
            cancel:string;
            close:string;
            mute:string;
            tags:string;
            manageTag:string;
        }

    }

}

export {}