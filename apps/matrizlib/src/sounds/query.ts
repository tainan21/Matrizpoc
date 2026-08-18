import type { SoundDefinition, SoundId } from "@matriz/design-ui/sounds"

import type { SoundCatalogFilters } from "./types"

function normalizeSearchValue(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR")
}

export function filterSoundCatalog(
  entries: readonly SoundDefinition[],
  filters: SoundCatalogFilters,
  packMembership: Readonly<Record<string, readonly SoundId[]>> = {},
): SoundDefinition[] {
  const query = normalizeSearchValue(filters.query?.trim() ?? "")
  const packIds = filters.packId && filters.packId !== "all" ? packMembership[filters.packId] : undefined

  return entries.filter((entry) => {
    const searchable = [entry.id, entry.name, entry.description, entry.category, entry.assetKey]
      .join(" ")
    const normalizedSearchable = normalizeSearchValue(searchable)
    return (
      (!query || normalizedSearchable.includes(query)) &&
      (!filters.category || filters.category === "all" || entry.category === filters.category) &&
      (!filters.status || filters.status === "all" || entry.status === filters.status) &&
      (!packIds || packIds.includes(entry.id))
    )
  })
}
