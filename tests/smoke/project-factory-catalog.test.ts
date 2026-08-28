import { describe, expect, it } from "vitest"
import { localAppRuntimes, monorepoConfig } from "@matriz/platform-config"

describe("local app runtime catalog", () => {
  it("derives every preferred base URL from one catalog", () => {
    expect(localAppRuntimes).toHaveLength(12)
    for (const app of localAppRuntimes) {
      expect(monorepoConfig.baseUrls[app.appId]).toBe(
        `http://${app.host}:${app.preferredPort}`,
      )
    }
  })

  it("keeps slugs, directories and ports unique", () => {
    expect(new Set(localAppRuntimes.map((app) => app.slug)).size).toBe(localAppRuntimes.length)
    expect(new Set(localAppRuntimes.map((app) => app.directory)).size).toBe(localAppRuntimes.length)
    expect(new Set(localAppRuntimes.map((app) => app.preferredPort)).size).toBe(localAppRuntimes.length)
  })
})
