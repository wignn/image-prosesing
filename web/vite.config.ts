import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        wasm(),
        topLevelAwait(),
    ],
    optimizeDeps: {
        exclude: ['image-pipeline-wasm'],
    },
    server: {
        fs: {
            // Allow serving files from the wasm pkg directory
            allow: ['..'],
        },
    },
})
