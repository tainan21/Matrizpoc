import { defineConfig } from "vitest/config"

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "app/**/*.test.ts", "app/**/*.test.tsx", "desktop/**/*.test.ts", "scripts/**/*.test.ts"],
  },
})
