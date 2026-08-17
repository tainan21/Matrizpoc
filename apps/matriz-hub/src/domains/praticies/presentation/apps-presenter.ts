import type { PracticeAppDefinition, PracticeAppKind, PracticeIconKey, PracticeWorkspaceState } from "@matriz/flows-praticies"

export interface PracticeAppVM {
  readonly id: string
  readonly name: string
  readonly shortName: string
  readonly summary: string
  readonly description: string
  readonly kind: PracticeAppKind
  readonly kindLabel: string
  readonly availability: "ready" | "preview"
  readonly availabilityLabel: string
  readonly glyph: string
  readonly iconKey: PracticeIconKey
  readonly accent: string
  readonly tags: readonly string[]
  readonly features: readonly string[]
  readonly href: string
}

export interface PracticeWorkspaceVM {
  readonly installedIds: readonly string[]
  readonly recent: readonly { readonly appId: string; readonly openedAt: string }[]
  readonly layout: readonly { readonly appId: string; readonly size: "compact" | "wide" }[]
}

const kindLabels: Record<PracticeAppKind, string> = {
  automation: "Automação",
  snippet: "Snippet",
  shortcut: "Atalho",
  gadget: "Gadget",
}

const destinations: Record<string, string> = {
  patterns: "/praticies#patterns",
  "validation-recipes": "/praticies#validation-recipes",
  "project-compass": "/praticies#project-compass",
  "release-notes": "/praticies#release-notes",
}

export function toPracticeAppVM(app: PracticeAppDefinition): PracticeAppVM {
  return {
    ...app,
    kindLabel: kindLabels[app.kind],
    availabilityLabel: app.availability === "ready" ? "Disponível" : "Em preview",
    href: destinations[app.id] ?? "/praticies/apps",
  }
}

export function toPracticeWorkspaceVM(state: PracticeWorkspaceState): PracticeWorkspaceVM {
  return { installedIds: state.installedIds, recent: state.recent, layout: state.layout }
}
