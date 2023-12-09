import { EmptyFile } from "../../constants";

type AppState = {
    loaded:boolean;
    currentFile:Mp.MediaFile;
    isMaximized:boolean;
    isFullScreen:boolean;
    playing:boolean;
    converting:boolean;
    tooltipVisible:boolean;
    media:Mp.MediaState;
}

type AppAction = {
    type: keyof AppState | keyof Mp.MediaState;
    value: any;
}

export const initialAppState : AppState = {
    loaded:false,
    currentFile:EmptyFile,
    isMaximized:false,
    isFullScreen:false,
    playing:false,
    converting:false,
    tooltipVisible:false,
    media:{
        mute:false,
        fitToWindow:false,
        currentTime:0,
        videoDuration:0,
        videoVolume:0,
        ampLevel:0,
        gainNode:null,
        playbackSpeed:0,
        seekSpeed:0
    }
}

export const appStateReducer = (state: AppState, action: AppAction): AppState => {

    switch (action.type) {

        case "currentFile": {
            if(!action.value){
                return {...state, currentFile:EmptyFile, loaded:false};
            }

            if(action.value.src){
                return {...state, currentFile:action.value, loaded:true};
            }

            return {...state, currentFile:action.value, loaded:false};
        }

        case "isMaximized":
            return {...state, isMaximized:action.value};

        case "isFullScreen":
            return {...state, isFullScreen:action.value};

        case "playing":
            return {...state, playing:action.value};

        case "converting":
            return {...state, converting:!state.converting};

        case "tooltipVisible":
            return {...state, converting:action.value};

        case "currentTime":
            return {...state, media:{...state.media, currentTime:action.value}};

        case "mute":
            return {...state, media:{...state.media, mute:!state.media.mute}};

        case "fitToWindow":
            return {...state, media:{...state.media, fitToWindow:action.value}};

        case "videoDuration":
            return {...state, media:{...state.media, videoDuration:action.value}};

        case "videoVolume":
            return {...state, media:{...state.media, videoVolume:action.value}};

        case "ampLevel":
            return {...state, media:{...state.media, ampLevel:action.value}};

        case "gainNode":
            return {...state, media:{...state.media, gainNode:action.value}};

        case "playbackSpeed":
            return {...state, media:{...state.media, playbackSpeed:action.value}};

        case "seekSpeed":
            return {...state, media:{...state.media, seekSpeed:action.value}};

        default:
            return state;
    }
};

