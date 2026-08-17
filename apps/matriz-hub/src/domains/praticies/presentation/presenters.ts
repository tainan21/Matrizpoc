interface PracticePresentationSource {
  readonly id: string
  readonly name: string
  readonly eyebrow: string
  readonly description: string
  readonly kind: "automation" | "snippet" | "gadget" | "shortcut"
  readonly availability: "ready" | "planned"
}

interface PatternGenerationPresentationSource {
  readonly generatedAt: string
  readonly mappedDirectoryCount: number
  readonly topLevelDirectoryCount: number
  readonly applicationBoundaryCount: number
  readonly packageGroupCount: number
  readonly skippedSymlinkCount: number
  readonly inaccessibleDirectoryCount: number
  readonly artifacts: readonly { readonly format: "human" | "llm"; readonly relativePath: string; readonly sizeBytes: number }[]
}

export interface PracticeItemVM {
  readonly id: string
  readonly name: string
  readonly eyebrow: string
  readonly description: string
  readonly kindLabel: string
  readonly statusLabel: string
  readonly ready: boolean
}

export interface PatternGenerationVM {
  readonly generatedAt: string
  readonly generatedAtLabel: string
  readonly mappedDirectoryCount: number
  readonly topLevelDirectoryCount: number
  readonly applicationBoundaryCount: number
  readonly packageGroupCount: number
  readonly skippedSymlinkCount: number
  readonly inaccessibleDirectoryCount: number
  readonly artifacts: ReadonlyArray<{
    format: "human" | "llm"
    label: string
    relativePath: string
    sizeLabel: string
    downloadHref: string
  }>
}

const kindLabels = {
  automation: "Automação",
  snippet: "Snippet",
  gadget: "Gadget",
  shortcut: "Atalho",
} as const

export function toPracticeItemVM(practice: PracticePresentationSource): PracticeItemVM {
  return {
    id: practice.id,
    name: practice.name,
    eyebrow: practice.eyebrow,
    description: practice.description,
    kindLabel: kindLabels[practice.kind],
    statusLabel: practice.availability === "ready" ? "Disponível" : "Em desenho",
    ready: practice.availability === "ready",
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
}

export function toPatternGenerationVM(
  generation: PatternGenerationPresentationSource,
): PatternGenerationVM {
  return {
    generatedAt: generation.generatedAt,
    generatedAtLabel: new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(generation.generatedAt)),
    mappedDirectoryCount: generation.mappedDirectoryCount,
    topLevelDirectoryCount: generation.topLevelDirectoryCount,
    applicationBoundaryCount: generation.applicationBoundaryCount,
    packageGroupCount: generation.packageGroupCount,
    skippedSymlinkCount: generation.skippedSymlinkCount,
    inaccessibleDirectoryCount: generation.inaccessibleDirectoryCount,
    artifacts: generation.artifacts.map((artifact) => ({
      format: artifact.format,
      label: artifact.format === "human" ? "Mapa humano" : "Mapa para LLM",
      relativePath: artifact.relativePath,
      sizeLabel: formatBytes(artifact.sizeBytes),
      downloadHref: `/api/praticies/patterns/${artifact.format}`,
    })),
  }
}
