import { defaultSoundAssets } from "./assets.generated"
import type { SoundPack } from "./types"

export const matrizDefaultSoundPack: SoundPack = Object.freeze({
  id: "matriz-default",
  name: "Matriz Default",
  description: "Pack sonoro padrão, curto e discreto para produtos Matriz.",
  assets: Object.freeze(defaultSoundAssets),
})
