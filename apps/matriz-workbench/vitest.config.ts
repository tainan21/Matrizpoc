import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: [{
      find: "server-only",
      replacement: path.resolve(import.meta.dirname, "src/test/server-only.ts"),
    }],
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    testTimeout: 15_000,
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
})
