import { defaultSoundAssets } from "./assets.generated"
import { SOUND_IDS } from "./catalog"
import type { SoundPack } from "./types"

const immutableAssets = Object.freeze(
  Object.fromEntries(
    SOUND_IDS.map((id) => [id, Object.freeze({ ...defaultSoundAssets[id] })]),
  ),
) as SoundPack["assets"]

export const matrizDefaultSoundPack: SoundPack = Object.freeze({
  id: "matriz-default",
  name: "Matriz Default",
  description: "Pack sonoro padrão, curto e discreto para produtos Matriz.",
  assets: immutableAssets,
})
