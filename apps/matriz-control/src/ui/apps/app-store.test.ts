import { describe, expect, it } from "vitest"
import { openInstalledApp, presentNativeStoreAction } from "./app-store"

describe("openInstalledApp", () => {
  it("selects the embedded host without requesting a separate browser window", () => {
    const activated: string[] = []

    openInstalledApp("health", (appId) => activated.push(appId))

    expect(activated).toEqual(["health"])
  })

  it.each([
    ["available", "download"], ["downloading", "cancel-download"], ["downloaded", "install"], ["installed", "open"], ["update_available", "open"], ["unavailable", null],
  ] as const)("offers the safe next native action for %s", (state, action) => {
    expect(presentNativeStoreAction(state)).toBe(action)
  })
})
