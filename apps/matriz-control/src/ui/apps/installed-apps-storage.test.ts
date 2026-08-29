import { describe, expect, it } from "vitest"
import { emptyInstalledAppsState } from "../../domain/installable-apps"
import { INSTALLED_APPS_STORAGE_KEY, readInstalledAppsState, writeInstalledAppsState } from "./installed-apps-storage"

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe("installed apps storage", () => {
  it("recovers a versioned state and ignores malformed persisted data", () => {
    const storage = new MemoryStorage()
    storage.setItem(INSTALLED_APPS_STORAGE_KEY, JSON.stringify({ version: 1, installedIds: ["health"], activeAppId: "health" }))

    expect(readInstalledAppsState(storage, ["health"])).toEqual({ version: 2, installedIds: ["health"], activeIds: ["health"], activeAppId: "health" })

    storage.setItem(INSTALLED_APPS_STORAGE_KEY, "not-json")
    expect(readInstalledAppsState(storage, ["health"])).toEqual(emptyInstalledAppsState())
  })

  it("writes only the versioned installation state", () => {
    const storage = new MemoryStorage()
    writeInstalledAppsState(storage, { version: 2, installedIds: ["health"], activeIds: [], activeAppId: null })

    expect(storage.getItem(INSTALLED_APPS_STORAGE_KEY)).toBe('{"version":2,"installedIds":["health"],"activeIds":[],"activeAppId":null}')
  })
})
