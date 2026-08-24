import type { PracticeAppDefinition, PracticeAppKind, PracticeIconKey, PracticeWorkspaceState } from "@matriz/flows-praticies"

export interface WorkbenchPracticeVM {
  readonly id: string
  readonly name: string
  readonly summary: string
  readonly description: string
  readonly kindLabel: string
  readonly availability: "ready" | "preview"
  readonly glyph: string
  readonly iconKey: PracticeIconKey
  readonly accent: string
  readonly features: readonly string[]
  readonly href: string
}

export interface WorkbenchPraticiesWorkspaceVM {
  readonly installedIds: readonly string[]
  readonly recent: readonly { readonly appId: string; readonly openedAt: string }[]
}

const kindLabels: Record<PracticeAppKind, string> = {
  automation: "Automação",
  snippet: "Snippet",
  shortcut: "Atalho",
  gadget: "Gadget",
}

const destinations: Record<string, string> = {
  patterns: "http://127.0.0.1:3000/praticies#patterns",
  "validation-recipes": "/settings",
  "project-compass": "/projects",
  "release-notes": "/knowledge",
}

export function toWorkbenchPracticeVM(app: PracticeAppDefinition): WorkbenchPracticeVM {
  return { ...app, kindLabel: kindLabels[app.kind], href: destinations[app.id] ?? "/praticies" }
}

export function toWorkbenchPraticiesWorkspaceVM(state: PracticeWorkspaceState): WorkbenchPraticiesWorkspaceVM {
  return { installedIds: state.installedIds, recent: state.recent }
}
