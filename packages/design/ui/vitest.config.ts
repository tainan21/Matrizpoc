import { defineConfig } from "vitest/config"

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.tsx", ".storybook/**/*.test.tsx", "scripts/**/*.test.ts", "scripts/**/*.test.tsx"],
  },
})
