import { defineConfig } from "vitest/config"

export default defineConfig({ test: { include: ["src/**/*.test.ts", "desktop/src/**/*.test.ts"], environment: "node" } })
