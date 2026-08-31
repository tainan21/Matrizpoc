import { defineConfig } from "vitest/config"
import { resolve } from "node:path"
import react from "@vitejs/plugin-react"
export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", include: ["src/**/*.test.ts", "src/**/*.test.tsx", "desktop/src/**/*.test.ts", "desktop/src/**/*.test.tsx"], setupFiles: ["src/test/setup.ts"] },
  resolve: { alias: { "@matriz/integration-api-contracts": resolve(__dirname, "../../packages/integration/api-contracts/src/index.ts") } },
})
