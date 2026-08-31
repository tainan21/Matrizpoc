import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"
export default defineConfig({ root: __dirname, plugins: [react()], build: { outDir: "dist", emptyOutDir: true }, resolve: { alias: { "@": resolve(__dirname, "src") } }, server: { host: "127.0.0.1", port: 14213, strictPort: true } })
