export type PracticeKind = "automation" | "snippet" | "gadget" | "shortcut"

export type PracticeAvailability = "ready" | "planned"

export interface PracticeDefinition {
  readonly id: string
  readonly name: string
  readonly eyebrow: string
  readonly description: string
  readonly kind: PracticeKind
  readonly availability: PracticeAvailability
}
export interface PatternArtifact {
  readonly format: "human" | "llm"
  readonly relativePath: string
  readonly sizeBytes: number
}

export interface PatternGeneration {
  readonly generatedAt: string
  readonly mappedDirectoryCount: number
  readonly topLevelDirectoryCount: number
  readonly applicationBoundaryCount: number
  readonly packageGroupCount: number
  readonly skippedSymlinkCount: number
  readonly inaccessibleDirectoryCount: number
  readonly artifacts: readonly PatternArtifact[]
}
