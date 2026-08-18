import { describe, expect, it, vi } from "vitest"

import { matrizDefaultSoundPack } from "./default-pack"
import { DEFAULT_SOUND_PREFERENCES, createMemorySoundPreferenceStore } from "./preferences"
import { createSoundRegistry } from "./registry"
import { createSoundSystem } from "./system"
import type { SoundAudioDriver } from "./driver"

function createDriver(options?: { rejectFirst?: boolean }): SoundAudioDriver & {
  plays: Array<{ source: string; volume: number }>
  stops: number
  finish(): void
} {
  let onEnded: (() => void) | undefined
  let attempts = 0
  const driver = {
    plays: [] as Array<{ source: string; volume: number }>,
    stops: 0,
    async play(source: string, volume: number, ended: () => void) {
      attempts += 1
      if (options?.rejectFirst && attempts === 1) {
        const error = new Error("Autoplay blocked")
        error.name = "NotAllowedError"
        throw error
      }
      driver.plays.push({ source, volume })
      onEnded = ended
    },
    stop() {
      driver.stops += 1
      onEnded = undefined
    },
    finish() {
      onEnded?.()
    },
  }
  return driver
}

function createActivationTarget() {
  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()
  return {
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      const group = listeners.get(type) ?? new Set()
      group.add(listener)
      listeners.set(type, group)
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      listeners.get(type)?.delete(listener)
    },
    count(type: string) {
      return listeners.get(type)?.size ?? 0
    },
    dispatch(type: string) {
      for (const listener of listeners.get(type) ?? []) {
        if (typeof listener === "function") listener(new Event(type))
        else listener.handleEvent(new Event(type))
      }
    },
  }
}

describe("sound system", () => {
  it("hydrates preferences and exposes immutable state", async () => {
    const preferences = createMemorySoundPreferenceStore({
      enabled: false,
      muted: true,
      volume: 0.25,
      packId: "matriz-default",
    })
    const system = createSoundSystem({ preferences, driver: createDriver() })

    expect(system.getState()).toEqual({
      ...DEFAULT_SOUND_PREFERENCES,
      initialized: false,
      playingId: undefined,
    })

    await system.initialize()

    expect(system.getState()).toEqual({
      enabled: false,
      muted: true,
      volume: 0.25,
      packId: "matriz-default",
      initialized: true,
      playingId: undefined,
    })
    expect(Object.isFrozen(system.getState())).toBe(true)
  })

  it("clears stale playing state when replacement playback is rejected", async () => {
    let attempt = 0
    const driver: SoundAudioDriver = {
      async play() {
        attempt += 1
        if (attempt === 2) throw new Error("device unavailable")
      },
      stop: vi.fn(),
    }
    const system = createSoundSystem({ driver, preferences: createMemorySoundPreferenceStore() })

    await system.play("success")
    expect(system.getState().playingId).toBe("success")
    await expect(system.play("error")).resolves.toMatchObject({ status: "skipped" })
    expect(system.getState().playingId).toBeUndefined()
  })

  it("respects enable, mute, volume and persists every global change", async () => {
    const preferences = createMemorySoundPreferenceStore()
    const driver = createDriver()
    const system = createSoundSystem({ preferences, driver })
    const states: number[] = []
    system.subscribe((state) => states.push(state.volume))
    await system.initialize()

    system.disable()
    expect(await system.play("notification")).toMatchObject({ status: "skipped", reason: "disabled" })
    system.enable()
    system.mute()
    expect(await system.play("notification")).toMatchObject({ status: "skipped", reason: "muted" })
    system.unmute()
    system.setVolume(8)

    expect(system.getVolume()).toBe(1)
    expect(system.isEnabled()).toBe(true)
    expect(system.isMuted()).toBe(false)
    expect(preferences.read()?.volume).toBe(1)
    expect(states.at(-1)).toBe(1)
  })

  it("plays one sound at the composed volume and clears state on end", async () => {
    const driver = createDriver()
    const system = createSoundSystem({ driver, preferences: createMemorySoundPreferenceStore() })
    system.setVolume(0.5)

    expect(await system.play("success")).toMatchObject({ status: "played", id: "success" })
    expect(driver.plays).toHaveLength(1)
    expect(driver.plays[0]?.volume).toBeCloseTo(0.34)
    expect(system.getState().playingId).toBe("success")

    await system.play("message")
    expect(driver.stops).toBeGreaterThanOrEqual(1)
    expect(system.getState().playingId).toBe("message")
    driver.finish()
    expect(system.getState().playingId).toBeUndefined()
  })

  it("switches to a complete replacement pack without changing semantic calls", async () => {
    const registry = createSoundRegistry()
    registry.registerPack({
      ...matrizDefaultSoundPack,
      id: "custom",
      name: "Custom",
      assets: Object.fromEntries(
        Object.entries(matrizDefaultSoundPack.assets).map(([id, asset]) => [id, { ...asset, source: `custom:${id}` }]),
      ) as typeof matrizDefaultSoundPack.assets,
    })
    const driver = createDriver()
    const system = createSoundSystem({ registry, driver, preferences: createMemorySoundPreferenceStore() })

    system.setPack("custom")
    await system.play("notification")

    expect(system.getPack()).toBe("custom")
    expect(driver.plays[0]?.source).toBe("custom:notification")
    expect(() => system.setPack("missing")).toThrow(/unknown sound pack/i)
  })

  it("queues blocked startup until the first legitimate interaction", async () => {
    const driver = createDriver({ rejectFirst: true })
    const activationTarget = createActivationTarget()
    const system = createSoundSystem({
      driver,
      activationTarget,
      preferences: createMemorySoundPreferenceStore(),
    })

    expect(await system.initialize({ startup: true })).toEqual({ status: "queued", id: "system.start" })
    expect(activationTarget.count("pointerdown")).toBe(1)
    expect(activationTarget.count("keydown")).toBe(1)

    activationTarget.dispatch("keydown")
    await vi.waitFor(() => expect(driver.plays).toHaveLength(1))
    expect(activationTarget.count("pointerdown")).toBe(0)
    expect(activationTarget.count("keydown")).toBe(0)
  })

  it("is inert without an audio driver and never blocks system end", async () => {
    const system = createSoundSystem({ preferences: createMemorySoundPreferenceStore() })

    expect(await system.play("notification")).toEqual({
      status: "skipped",
      id: "notification",
      reason: "unsupported",
    })
    await expect(system.play("system.end")).resolves.toMatchObject({ status: "skipped" })
  })
})
