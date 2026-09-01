import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./acceptance/e2e",
  testMatch: "**/*.pw.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 900_000,
  expect: { timeout: 20_000 },
  outputDir: "../../output/playwright/matriz-control",
  reporter: [["line"]],
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
})
