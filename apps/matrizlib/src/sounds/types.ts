import type { SoundCategory, SoundDefinition, SoundId, SoundStatus } from "@matriz/design-ui/sounds"

export interface SoundCatalogFilters {
  readonly query?: string
  readonly category?: SoundCategory | "all"
  readonly status?: SoundStatus | "all"
  readonly packId?: string | "all"
}

export interface SoundCatalogItemViewModel extends SoundDefinition {
  readonly categoryLabel: string
  readonly statusLabel: string
  readonly assetFile: string
  readonly defaultVolumeLabel: string
}

export interface SoundCatalogPageViewModel {
  readonly summary: {
    readonly total: number
    readonly available: number
    readonly categories: number
    readonly packs: number
  }
  readonly items: readonly SoundCatalogItemViewModel[]
}

export interface SoundPackViewModel {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly soundIds: readonly SoundId[]
}
