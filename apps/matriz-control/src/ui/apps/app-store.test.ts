import { describe, expect, it } from "vitest"
import { openInstalledApp } from "./app-store"

describe("openInstalledApp", () => {
  it("selects the embedded host without requesting a separate browser window", () => {
    const activated: string[] = []

    openInstalledApp("health", (appId) => activated.push(appId))

    expect(activated).toEqual(["health"])
  })
})
