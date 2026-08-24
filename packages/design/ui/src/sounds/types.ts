export type SoundId =
  | "system.start"
  | "system.end"
  | "notification"
  | "message"
  | "order"
  | "success"
  | "error"
  | "warning"
  | "interaction"
  | "navigation"
  | "open"
  | "close"

export type SoundCategory = "system" | "communication" | "commerce" | "status" | "interaction"
export type SoundStatus = "available" | "disabled"

export interface SoundDefinition {
  readonly id: SoundId
  readonly name: string
  readonly description: string
  readonly category: SoundCategory
  readonly status: SoundStatus
  readonly assetKey: string
  readonly defaultVolume: number
  readonly defaultEnabled: boolean
  readonly accessibility: string
}

export interface SoundAsset {
  readonly source: string
  readonly mimeType: "audio/wav"
  readonly durationMs: number
}

export interface SoundPack {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly assets: Readonly<Record<SoundId, SoundAsset>>
}

export interface SoundRegistry {
  listSounds(): readonly SoundDefinition[]
  getSound(id: SoundId): SoundDefinition
  listPacks(): readonly SoundPack[]
  getPack(id: string): SoundPack | undefined
  registerPack(pack: SoundPack): void
}
