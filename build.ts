import {build} from "electron-builder"

build({
    config: {
        appId: "com.altmediaplayer.app",
        productName: "altmediaplayer",
        extraResources:[
            "./resources/ffmpeg.exe",
            "./resources/ffprobe.exe"
        ],
        win:{
            target: {
                target: "nsis",
                arch: [
                    "x64",
                ]
            },
            icon: "/src/assets/icon.ico",
            fileAssociations: [
                {
                    "ext": ["mp4","mov","avi","wmv","webm","flv"],
                    "icon": "src/assets/icon.ico",
                },
                {
                    "ext": "mp3",
                    "icon": "src/assets/icon_audio.ico",
                },

            ]
        },
        linux:{
            target: "deb",
            category: "AudioVideo",
            icon: "./src/assets/icon.icns",
            fileAssociations: [
                {
                    "ext": "mp4",
                  },
                  {
                    "ext": "mp3",
                  }
            ]
        },
        nsis: {
            oneClick: true,
            deleteAppDataOnUninstall:true,
            runAfterFinish: false,
        }
    },
});