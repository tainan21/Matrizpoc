import { describe, expect, it } from "vitest"

import {
  DEFAULT_SOUND_PREFERENCES,
  SOUND_PREFERENCES_KEY,
  createBrowserSoundPreferenceStore,
  createMemorySoundPreferenceStore,
} from "./preferences"

function createStorage(initial?: Record<string, string>) {
  const values = new Map(Object.entries(initial ?? {}))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    value: (key: string) => values.get(key),
  }
}

describe("sound preference stores", () => {
  it("uses one versioned key and falls back from malformed data", () => {
    const storage = createStorage({ [SOUND_PREFERENCES_KEY]: "not-json" })
    const store = createBrowserSoundPreferenceStore(storage)

    expect(SOUND_PREFERENCES_KEY).toBe("matriz:sound-preferences:v1")
    expect(store.read()).toEqual(DEFAULT_SOUND_PREFERENCES)
  })

  it("normalizes persisted fields and clamps volume", () => {
    const storage = createStorage({
      [SOUND_PREFERENCES_KEY]: JSON.stringify({
        enabled: false,
        muted: true,
        volume: 9,
        packId: "custom",
      }),
    })

    expect(createBrowserSoundPreferenceStore(storage).read()).toEqual({
      enabled: false,
      muted: true,
      volume: 1,
      packId: "custom",
    })
  })

  it("writes a complete preference record", () => {
    const storage = createStorage()
    const store = createBrowserSoundPreferenceStore(storage)
    store.write({ enabled: true, muted: false, volume: 0.35, packId: "matriz-default" })

    expect(JSON.parse(storage.value(SOUND_PREFERENCES_KEY) ?? "{}")).toEqual({
      enabled: true,
      muted: false,
      volume: 0.35,
      packId: "matriz-default",
    })
  })

  it("keeps memory state isolated from returned objects", () => {
    const store = createMemorySoundPreferenceStore()
    const first = store.read()
    store.write({ enabled: false, muted: true, volume: 0.2, packId: "matriz-default" })

    expect(first).toEqual(DEFAULT_SOUND_PREFERENCES)
    expect(store.read()).toEqual({ enabled: false, muted: true, volume: 0.2, packId: "matriz-default" })
    expect(store.read()).not.toBe(store.read())
  })

  it("does not throw when browser storage access is denied", () => {
    const browser = globalThis as typeof globalThis & { window?: Window }
    const previous = browser.window
    Object.defineProperty(browser, "window", {
      configurable: true,
      value: Object.defineProperty({}, "localStorage", {
        get() {
          throw new DOMException("Denied", "SecurityError")
        },
      }),
    })

    expect(() => createBrowserSoundPreferenceStore()).not.toThrow()
    expect(createBrowserSoundPreferenceStore().read()).toEqual(DEFAULT_SOUND_PREFERENCES)

    Object.defineProperty(browser, "window", { configurable: true, value: previous })
  })
})
