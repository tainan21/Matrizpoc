import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  clearScreen: false,
  server: { host: "127.0.0.1", port: 1421, strictPort: true },
  build: { target: "es2022", outDir: "dist", emptyOutDir: true },
})
