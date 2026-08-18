import { SOUND_IDS, soundCatalog } from "./catalog"
import { matrizDefaultSoundPack } from "./default-pack"
import type { SoundAsset, SoundId, SoundPack, SoundRegistry } from "./types"

const soundIdSet = new Set<string>(SOUND_IDS)

function freezeAsset(asset: SoundAsset): SoundAsset {
  return Object.freeze({ ...asset })
}

function validateAndFreezePack(pack: SoundPack): SoundPack {
  const keys = Object.keys(pack.assets)
  for (const id of SOUND_IDS) {
    if (!(id in pack.assets)) throw new Error(`Missing sound ${id} in pack ${pack.id}`)
  }
  for (const key of keys) {
    if (!soundIdSet.has(key)) throw new Error(`Unknown sound ${key} in pack ${pack.id}`)
  }

  const assets = Object.fromEntries(
    SOUND_IDS.map((id) => [id, freezeAsset(pack.assets[id])]),
  ) as Record<SoundId, SoundAsset>

  return Object.freeze({ ...pack, assets: Object.freeze(assets) })
}

export function createSoundRegistry(
  initialPacks: readonly SoundPack[] = [matrizDefaultSoundPack],
): SoundRegistry {
  const packs = new Map<string, SoundPack>()
  for (const pack of initialPacks) {
    if (packs.has(pack.id)) throw new Error(`Sound pack ${pack.id} is already registered`)
    packs.set(pack.id, validateAndFreezePack(pack))
  }

  return {
    listSounds: () => Object.freeze(soundCatalog.map((entry) => Object.freeze({ ...entry }))),
    getSound: (id) => {
      const sound = soundCatalog.find((entry) => entry.id === id)
      if (!sound) throw new Error(`Unknown sound ${id}`)
      return sound
    },
    listPacks: () => Object.freeze(Array.from(packs.values())),
    getPack: (id) => packs.get(id),
    registerPack: (pack) => {
      if (packs.has(pack.id)) throw new Error(`Sound pack ${pack.id} is already registered`)
      packs.set(pack.id, validateAndFreezePack(pack))
    },
  }
}

export const soundRegistry = createSoundRegistry()
