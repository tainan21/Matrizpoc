import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@apps/health/public-contract": fileURLToPath(new URL("../health/public-contract.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    poolOptions: { threads: { singleThread: true } },
  },
})
