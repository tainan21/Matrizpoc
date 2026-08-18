import type { SoundDefinition, SoundId } from "@matriz/design-ui/sounds"

import type { SoundCatalogFilters } from "./types"

export function filterSoundCatalog(
  entries: readonly SoundDefinition[],
  filters: SoundCatalogFilters,
  packMembership: Readonly<Record<string, readonly SoundId[]>> = {},
): SoundDefinition[] {
  const query = filters.query?.trim().toLocaleLowerCase("pt-BR") ?? ""
  const packIds = filters.packId && filters.packId !== "all" ? packMembership[filters.packId] : undefined

  return entries.filter((entry) => {
    const searchable = [entry.id, entry.name, entry.description, entry.category, entry.assetKey]
      .join(" ")
      .toLocaleLowerCase("pt-BR")
    return (
      (!query || searchable.includes(query)) &&
      (!filters.category || filters.category === "all" || entry.category === filters.category) &&
      (!filters.status || filters.status === "all" || entry.status === filters.status) &&
      (!packIds || packIds.includes(entry.id))
    )
  })
}
