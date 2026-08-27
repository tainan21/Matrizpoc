import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@apps/health/public-contract": fileURLToPath(new URL("../health/public-contract.ts", import.meta.url)),
      "@apps/matriz-workbench/public-contract": fileURLToPath(new URL("../matriz-workbench/public-contract.ts", import.meta.url)),
      "@apps/seumei/public-contract": fileURLToPath(new URL("../seumeiapp/public-contract.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "app/**/*.test.ts"],
    poolOptions: { threads: { singleThread: true } },
  },
})
