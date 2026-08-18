import type {
  ComponentCatalogCategory,
  ComponentCatalogEntry,
  ComponentCatalogId,
  ComponentCatalogQualification,
  ComponentCatalogStage,
} from "./types"

const categoryLabels: Record<ComponentCatalogCategory, string> = {
  layout: "Layout",
  content: "Conteúdo",
  input: "Entrada",
  feedback: "Feedback",
  context: "Contexto",
  navigation: "Navegação",
  overlay: "Sobreposição",
  "data-display": "Exibição de dados",
  accessibility: "Acessibilidade",
  identity: "Identidade",
}

const stageLabels: Record<ComponentCatalogStage, string> = {
  available: "Disponível",
  candidate: "Candidato",
}

const qualificationLabels: Record<ComponentCatalogQualification, string> = {
  qualified: "Qualificado",
  backlog: "Backlog de validação",
}

export interface ComponentCatalogCardViewModel {
  readonly id: ComponentCatalogId
  readonly name: string
  readonly slug: string
  readonly href: string
  readonly category: ComponentCatalogCategory
  readonly categoryLabel: string
  readonly stage: ComponentCatalogStage
  readonly stageLabel: string
  readonly qualification: ComponentCatalogQualification
  readonly qualificationLabel: string
  readonly description: string
}

export interface ComponentCatalogDetailViewModel extends ComponentCatalogCardViewModel {
  readonly importStatement?: string
  readonly packageStatus?: "experimental" | "beta" | "stable" | "deprecated"
  readonly source?: string
  readonly tags: readonly string[]
  readonly tokens: readonly string[]
  readonly accessibility: readonly string[]
  readonly related: readonly string[]
  readonly evidence: string
  readonly potentialConsumers: string
  readonly domainBoundary: string
}

export interface ComponentCatalogPageViewModel {
  readonly summary: {
    readonly total: number
    readonly available: number
    readonly candidates: number
    readonly qualified: number
  }
  readonly items: readonly ComponentCatalogCardViewModel[]
}

export function toComponentCatalogCardViewModel(
  entry: ComponentCatalogEntry,
): ComponentCatalogCardViewModel {
  return {
    id: entry.id,
    name: entry.name,
    slug: entry.slug,
    href: `/components/${entry.slug}`,
    category: entry.category,
    categoryLabel: categoryLabels[entry.category],
    stage: entry.stage,
    stageLabel: stageLabels[entry.stage],
    qualification: entry.qualification,
    qualificationLabel: qualificationLabels[entry.qualification],
    description: entry.description,
  }
}

export function toComponentCatalogDetailViewModel(
  entry: ComponentCatalogEntry,
): ComponentCatalogDetailViewModel {
  const metadata = entry.packageMetadata

  return {
    ...toComponentCatalogCardViewModel(entry),
    importStatement: entry.importPath
      ? `import { ${entry.name} } from "${entry.importPath}"`
      : undefined,
    packageStatus: metadata?.status,
    source: metadata?.source,
    tags: metadata ? [...metadata.tags] : [],
    tokens: metadata ? [...metadata.tokens] : [],
    accessibility: metadata ? [...metadata.accessibility] : [],
    related: metadata ? [...metadata.related] : [],
    evidence: entry.evidence,
    potentialConsumers: entry.potentialConsumers,
    domainBoundary: entry.domainBoundary,
  }
}

export function toComponentCatalogPageViewModel(
  entries: readonly ComponentCatalogEntry[],
): ComponentCatalogPageViewModel {
  return {
    summary: {
      total: entries.length,
      available: entries.filter((entry) => entry.stage === "available").length,
      candidates: entries.filter((entry) => entry.stage === "candidate").length,
      qualified: entries.filter((entry) => entry.qualification === "qualified").length,
    },
    items: entries.map(toComponentCatalogCardViewModel),
  }
}
