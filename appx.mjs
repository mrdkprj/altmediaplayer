import { build } from "electron-builder"

build({
    config: {
        appId: "com.altmediaplayer.app",
        productName: "AltMediaPlayer",
        files:[
            "out/**/*",
            "!**/node_modules/**/target${/*}"
        ],
        extraResources:[
            "./resources/ffmpeg.exe",
        ],
        includeSubNodeModules:false,
        win:{
            target: {
                target: "appx",
                arch: [
                    "x64"
                ],
            },
            icon: "/src/assets/icon.ico",
            fileAssociations: [
                {
                    "ext": ["mp4","mov","webm","ogg","ogv"],
                    "icon": "src/assets/icon.ico",
                },
                {
                    "ext": ["mp3","oga"],
                    "icon": "src/assets/icon_audio.ico",
                },

            ],
            certificateFile:process.env.CERT,
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
        appx:{
            applicationId: "AltMediaPlayer",
            identityName:"7610granarbo.AltMediaPlayer",
            displayName: "AltMediaPlayer",
            publisherDisplayName: "granarbo",
            languages: ["en-us"],
            backgroundColor:"transparent"
        },
        nsis: {
            oneClick: true,
            deleteAppDataOnUninstall:true,
            runAfterFinish: false,
        }
    },
});