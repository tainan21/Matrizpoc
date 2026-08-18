import { componentCatalog } from "./component-catalog"
import type {
  ComponentCatalogCategory,
  ComponentCatalogEntry,
  ComponentCatalogStage,
} from "./types"

export interface ComponentCatalogFilters {
  readonly query?: string
  readonly category?: ComponentCatalogCategory | "all"
  readonly stage?: ComponentCatalogStage | "all"
}

function searchableText(entry: ComponentCatalogEntry): string {
  const metadataText = entry.packageMetadata
    ? [
        entry.packageMetadata.source,
        ...entry.packageMetadata.tags,
        ...entry.packageMetadata.tokens,
        ...entry.packageMetadata.related,
      ]
    : []

  return [
    entry.id,
    entry.name,
    entry.description,
    entry.category,
    entry.evidence,
    entry.potentialConsumers,
    entry.domainBoundary,
    ...metadataText,
  ]
    .join(" ")
    .toLocaleLowerCase("en-US")
}

export function filterComponentCatalog(
  entries: readonly ComponentCatalogEntry[],
  filters: ComponentCatalogFilters,
): ComponentCatalogEntry[] {
  const query = filters.query?.trim().toLocaleLowerCase("en-US") ?? ""

  return entries.filter((entry) => {
    const matchesQuery = query.length === 0 || searchableText(entry).includes(query)
    const matchesCategory =
      !filters.category || filters.category === "all" || entry.category === filters.category
    const matchesStage = !filters.stage || filters.stage === "all" || entry.stage === filters.stage

    return matchesQuery && matchesCategory && matchesStage
  })
}

export function findComponentBySlug(
  slug: string,
  entries: readonly ComponentCatalogEntry[] = componentCatalog,
): ComponentCatalogEntry | undefined {
  return entries.find((entry) => entry.slug === slug)
}
