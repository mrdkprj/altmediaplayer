import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()]
    },
    preload: {
        build:{
            lib:{
                entry:"src/main/preload.ts"
            }
        },
        plugins: [externalizeDepsPlugin()]
    },
    renderer: {
        build:{
            rollupOptions:{
                input:{
                    player_window:"src/renderer/player/index.html",
                    playlist_window:"src/renderer/playlist/index.html",
                    convert_window:"src/renderer/convert/index.html",
                    tag_window:"src/renderer/tag/index.html"
                }
            }
        },
        plugins: [svelte()]
    }
})