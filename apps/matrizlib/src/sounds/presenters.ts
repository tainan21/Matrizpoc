import type { SoundCategory, SoundDefinition, SoundPack, SoundStatus } from "@matriz/design-ui/sounds"

import type { SoundCatalogPageViewModel, SoundPackViewModel } from "./types"

const categoryLabels: Record<SoundCategory, string> = {
  system: "Sistema",
  communication: "Comunicação",
  commerce: "Comércio",
  status: "Estado",
  interaction: "Interação",
}

const statusLabels: Record<SoundStatus, string> = {
  available: "Disponível",
  disabled: "Desativado",
}

export function toSoundPackViewModels(packs: readonly SoundPack[]): SoundPackViewModel[] {
  return packs.map((pack) => ({
    id: pack.id,
    name: pack.name,
    description: pack.description,
    soundIds: Object.keys(pack.assets) as SoundPackViewModel["soundIds"],
  }))
}

export function toSoundCatalogPageViewModel(
  entries: readonly SoundDefinition[],
  packs: readonly SoundPack[],
  activePackId = packs[0]?.id,
): SoundCatalogPageViewModel {
  const activePack = packs.find(({ id }) => id === activePackId) ?? packs[0]
  return {
    summary: {
      total: entries.length,
      available: entries.filter(({ status }) => status === "available").length,
      categories: new Set(entries.map(({ category }) => category)).size,
      activePack: activePack?.name ?? "Nenhum",
    },
    items: entries.map((entry) => ({
      ...entry,
      categoryLabel: categoryLabels[entry.category],
      statusLabel: statusLabels[entry.status],
      assetFile: entry.assetKey,
      defaultVolumeLabel: `${Math.round(entry.defaultVolume * 100)}%`,
    })),
  }
}
