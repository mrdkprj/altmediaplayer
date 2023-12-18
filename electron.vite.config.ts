import { defineConfig } from "electron-vite"

export default defineConfig({
    main: {
        build:{
            rollupOptions:{
                external:["fluent-ffmpeg"]
            }
        }
    },
    preload: {
        build:{
            lib:{
                entry:"src/main/preload.ts"
            }
        }
    },
    renderer: {
        build:{
            rollupOptions:{
                input:{
                    player_window:"src/renderer/player/index.html",
                    playlist_window:"src/renderer/playlist/index.html",
                    convert_window:"src/renderer/convert/index.html"
                }
            }
        }
    }
})