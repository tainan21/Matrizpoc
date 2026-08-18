import { describe, expect, it } from "vitest"

import { SOUND_IDS, soundCatalog } from "./catalog"
import { matrizDefaultSoundPack } from "./default-pack"
import { createSoundRegistry } from "./registry"
import type { SoundPack } from "./types"

const expectedIds = [
  "system.start",
  "system.end",
  "notification",
  "message",
  "order",
  "success",
  "error",
  "warning",
  "interaction",
  "navigation",
  "open",
  "close",
] as const

function clonePack(id: string): SoundPack {
  return {
    id,
    name: `Pack ${id}`,
    description: "Pack completo para teste de substituição semântica.",
    assets: { ...matrizDefaultSoundPack.assets },
  }
}

describe("canonical sound catalog", () => {
  it("defines every semantic sound exactly once", () => {
    expect(SOUND_IDS).toEqual(expectedIds)
    expect(soundCatalog.map((entry) => entry.id)).toEqual(expectedIds)
    expect(new Set(soundCatalog.map((entry) => entry.id)).size).toBe(12)
  })

  it("publishes complete catalog metadata with safe volume defaults", () => {
    for (const entry of soundCatalog) {
      expect(entry.name).not.toBe("")
      expect(entry.description).not.toBe("")
      expect(entry.assetKey).not.toBe("")
      expect(entry.accessibility).not.toBe("")
      expect(entry.defaultVolume).toBeGreaterThanOrEqual(0)
      expect(entry.defaultVolume).toBeLessThanOrEqual(1)
    }
  })

  it("ships an audible WAV asset for every semantic ID", () => {
    expect(Object.keys(matrizDefaultSoundPack.assets).sort()).toEqual([...expectedIds].sort())

    for (const asset of Object.values(matrizDefaultSoundPack.assets)) {
      expect(asset.source).toMatch(/^data:audio\/wav;base64,/)
      expect(asset.source.length).toBeGreaterThan(100)
      expect(asset.mimeType).toBe("audio/wav")
      expect(asset.durationMs).toBeGreaterThan(0)
    }
  })
})

describe("sound registry", () => {
  it("returns immutable snapshots instead of mutable internals", () => {
    const registry = createSoundRegistry()
    const packs = registry.listPacks()
    const sounds = registry.listSounds()

    expect(Object.isFrozen(packs)).toBe(true)
    expect(Object.isFrozen(sounds)).toBe(true)
    expect(Object.isFrozen(packs[0])).toBe(true)
    expect(Object.isFrozen(sounds[0])).toBe(true)
  })

  it("registers a complete replacement pack", () => {
    const registry = createSoundRegistry()
    registry.registerPack(clonePack("custom"))

    expect(registry.getPack("custom")?.name).toBe("Pack custom")
    expect(registry.listPacks()).toHaveLength(2)
  })

  it("rejects incomplete and duplicate packs", () => {
    const registry = createSoundRegistry()
    const complete = clonePack("custom")
    const { close: _close, ...incompleteAssets } = complete.assets
    const incomplete = { ...complete, id: "incomplete", assets: incompleteAssets } as SoundPack

    expect(() => registry.registerPack(incomplete)).toThrow(/missing sound close/i)
    registry.registerPack(complete)
    expect(() => registry.registerPack(complete)).toThrow(/already registered/i)
  })

  it("rejects packs with arbitrary sound IDs", () => {
    const registry = createSoundRegistry()
    const complete = clonePack("unknown")
    const invalid = {
      ...complete,
      assets: { ...complete.assets, arbitrary: complete.assets.notification },
    } as unknown as SoundPack

    expect(() => registry.registerPack(invalid)).toThrow(/unknown sound arbitrary/i)
  })
})
