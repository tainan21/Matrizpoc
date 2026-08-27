import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
export default defineConfig({root:fileURLToPath(new URL(".",import.meta.url)),clearScreen:false,server:{host:"127.0.0.1",port:1422,strictPort:true},build:{target:"es2022",outDir:"dist",emptyOutDir:true}})
