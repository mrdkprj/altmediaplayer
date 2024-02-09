export const APP_NAME = "AltMediaPlayer";

export const EmptyFile:Mp.MediaFile = {
    id:"",
    fullPath:"",
    src:"",
    name:"",
    date: 0,
    extension:"",
    dir:"",
}

export const VideoFormats = [
    "mp4",
    "mov",
    "avi",
    "wmv",
    "webm",
    "flv"
]

export const VideoExtentions = [
    ".mp4",
    ".mov",
    ".avi",
    ".wmv",
    ".webm",
    ".flv"
]

export const AudioFormats = [
    "wav",
    "mp3",
    "webm",
]

export const AudioExtentions = [
    ".wav",
    ".mp3",
    ".webm",
]

export const Resolutions = {
    "SizeNone": "",
    "360p":"480x360",
    "480p":"640x480",
    "720p":"1280x720",
    "1080p":"1920x1080",
}

export const Rotations = {
    "RotationNone": 0,
    "90Clockwise": 1,
    "90CounterClockwise":2
}

export const FORWARD = 1;
export const BACKWARD = -1
export const Buttons = {
    left:0,
    right:2,
}

export const handleKeyEvent = () => { /**/ }
