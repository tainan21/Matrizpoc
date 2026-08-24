import type { KeyValueStore } from "@matriz/platform-storage"

export const PRATICIES_STATE_VERSION = 1 as const

export type PracticeAppKind = "automation" | "snippet" | "shortcut" | "gadget"
export type PracticeAvailability = "ready" | "preview"
export type PracticeCardSize = "compact" | "wide"
export type PracticeIconKey = "folders" | "checklist" | "compass" | "note" | "spark" | "timer"

export interface PracticeAppDefinition {
  readonly id: string
  readonly name: string
  readonly shortName: string
  readonly summary: string
  readonly description: string
  readonly kind: PracticeAppKind
  readonly availability: PracticeAvailability
  readonly iconKey: PracticeIconKey
  readonly glyph: string
  readonly accent: string
  readonly tags: readonly string[]
  readonly features: readonly string[]
}

export interface PracticeRecentEntry {
  readonly appId: string
  readonly openedAt: string
}

export interface PracticeLayoutItem {
  readonly appId: string
  readonly size: PracticeCardSize
}

export interface PracticeWorkspaceState {
  readonly version: typeof PRATICIES_STATE_VERSION
  readonly installedIds: readonly string[]
  readonly recent: readonly PracticeRecentEntry[]
  readonly layout: readonly PracticeLayoutItem[]
}

export interface PraticiesRepository {
  load(): PracticeWorkspaceState
  save(state: PracticeWorkspaceState): void
}

export const DEFAULT_PRACTICE_APPS = [
  {
    id: "patterns",
    name: "Project patterns",
    shortName: "Patterns",
    summary: "Mapa estrutural do workspace em dois formatos.",
    description: "Lê somente diretórios e gera uma visão humana e outra otimizada para agentes, sem abrir o conteúdo dos arquivos.",
    kind: "automation",
    availability: "ready",
    iconKey: "folders",
    glyph: "PT",
    accent: "lime",
    tags: ["workspace", "estrutura", "LLM"],
    features: ["Saída humana", "Saída para LLM", "Escopo protegido"],
  },
  {
    id: "validation-recipes",
    name: "Validation recipes",
    shortName: "Recipes",
    summary: "Comandos de qualidade prontos para copiar.",
    description: "Agrupa receitas de lint, tipos e smoke checks para diminuir o atrito entre mudança e evidência.",
    kind: "snippet",
    availability: "ready",
    iconKey: "checklist",
    glyph: "VR",
    accent: "cyan",
    tags: ["qualidade", "comandos", "evidência"],
    features: ["Cópia rápida", "Checks scoped", "Sem execução automática"],
  },
  {
    id: "project-compass",
    name: "Project compass",
    shortName: "Compass",
    summary: "Atalhos para saúde, docs e ecossistema.",
    description: "Concentra destinos operacionais frequentes e reduz a navegação necessária para encontrar contexto.",
    kind: "shortcut",
    availability: "ready",
    iconKey: "compass",
    glyph: "PC",
    accent: "amber",
    tags: ["navegação", "saúde", "docs"],
    features: ["Rotas locais", "Acesso imediato", "Contexto operacional"],
  },
  {
    id: "release-notes",
    name: "Release notes",
    shortName: "Releases",
    summary: "Modelo enxuto para comunicar uma entrega.",
    description: "Oferece uma estrutura reutilizável para transformar mudanças, validações e riscos em notas de entrega legíveis.",
    kind: "snippet",
    availability: "ready",
    iconKey: "note",
    glyph: "RN",
    accent: "violet",
    tags: ["release", "comunicação", "template"],
    features: ["Template editorial", "Seções essenciais", "Copiar e adaptar"],
  },
  {
    id: "context-brief",
    name: "Context brief",
    shortName: "Brief",
    summary: "Handoff curto para iniciar uma sessão.",
    description: "Combinará documentos preferidos, roadmap e mudanças recentes em um pacote de contexto versionado.",
    kind: "gadget",
    availability: "preview",
    iconKey: "spark",
    glyph: "CB",
    accent: "coral",
    tags: ["contexto", "agentes", "handoff"],
    features: ["Contexto selecionado", "Resumo versionado", "Em desenho"],
  },
  {
    id: "focus-timer",
    name: "Focus timer",
    shortName: "Focus",
    summary: "Ciclos de foco ligados ao trabalho atual.",
    description: "Um gadget compacto para iniciar blocos de concentração e registrar apenas a intenção, sem telemetria invasiva.",
    kind: "gadget",
    availability: "preview",
    iconKey: "timer",
    glyph: "FT",
    accent: "blue",
    tags: ["foco", "tempo", "local-first"],
    features: ["Timer local", "Pausas conscientes", "Em desenho"],
  },
] as const satisfies readonly PracticeAppDefinition[]

const DEFAULT_INSTALLED_IDS = ["patterns", "validation-recipes", "project-compass"] as const

export function createDefaultPraticiesState(
  catalog: readonly PracticeAppDefinition[] = DEFAULT_PRACTICE_APPS,
): PracticeWorkspaceState {
  const readyIds = new Set(catalog.filter((app) => app.availability === "ready").map((app) => app.id))
  const installedIds = DEFAULT_INSTALLED_IDS.filter((id) => readyIds.has(id))
  return {
    version: PRATICIES_STATE_VERSION,
    installedIds,
    recent: [],
    layout: installedIds.map((appId, index) => ({
      appId,
      size: index === 0 ? "wide" : "compact",
    })),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === "string"))]
}

export function normalizePraticiesState(
  value: unknown,
  catalog: readonly PracticeAppDefinition[] = DEFAULT_PRACTICE_APPS,
): PracticeWorkspaceState {
  if (!isRecord(value)) return createDefaultPraticiesState(catalog)
  const catalogIds = new Set(catalog.map((app) => app.id))
  const readyIds = new Set(catalog.filter((app) => app.availability === "ready").map((app) => app.id))
  const installedIds = uniqueStrings(value.installedIds).filter((id) => readyIds.has(id))

  const recent: PracticeRecentEntry[] = []
  const recentIds = new Set<string>()
  if (Array.isArray(value.recent)) {
    for (const entry of value.recent) {
      if (!isRecord(entry) || typeof entry.appId !== "string" || typeof entry.openedAt !== "string") continue
      if (!catalogIds.has(entry.appId) || recentIds.has(entry.appId) || Number.isNaN(Date.parse(entry.openedAt))) continue
      recentIds.add(entry.appId)
      recent.push({ appId: entry.appId, openedAt: entry.openedAt })
    }
  }

  const layout: PracticeLayoutItem[] = []
  const layoutIds = new Set<string>()
  if (Array.isArray(value.layout)) {
    for (const item of value.layout) {
      if (!isRecord(item) || typeof item.appId !== "string") continue
      if (!installedIds.includes(item.appId) || layoutIds.has(item.appId)) continue
      layoutIds.add(item.appId)
      layout.push({ appId: item.appId, size: item.size === "wide" ? "wide" : "compact" })
    }
  }
  for (const appId of installedIds) {
    if (!layoutIds.has(appId)) layout.push({ appId, size: "compact" })
  }

  return { version: PRATICIES_STATE_VERSION, installedIds, recent, layout }
}

export function reorderLayout(
  layout: readonly PracticeLayoutItem[],
  draggedId: string,
  targetId: string,
): PracticeLayoutItem[] {
  if (draggedId === targetId) return [...layout]
  const from = layout.findIndex((item) => item.appId === draggedId)
  const to = layout.findIndex((item) => item.appId === targetId)
  if (from < 0 || to < 0) return [...layout]
  const next = [...layout]
  const [moved] = next.splice(from, 1)
  if (!moved) return next
  next.splice(to, 0, moved)
  return next
}

export class PraticiesService {
  readonly #byId: ReadonlyMap<string, PracticeAppDefinition>

  constructor(
    private readonly repository: PraticiesRepository,
    catalog: readonly PracticeAppDefinition[] = DEFAULT_PRACTICE_APPS,
    private readonly now: () => Date = () => new Date(),
    private readonly recentLimit = 6,
  ) {
    this.#byId = new Map(catalog.map((app) => [app.id, app]))
  }

  getState(): PracticeWorkspaceState {
    return this.repository.load()
  }

  install(appId: string): PracticeWorkspaceState {
    const app = this.#byId.get(appId)
    const state = this.repository.load()
    if (!app || app.availability !== "ready" || state.installedIds.includes(appId)) return state
    return this.#save({
      ...state,
      installedIds: [...state.installedIds, appId],
      layout: [...state.layout, { appId, size: "compact" }],
    })
  }

  uninstall(appId: string): PracticeWorkspaceState {
    const state = this.repository.load()
    if (!state.installedIds.includes(appId)) return state
    return this.#save({
      ...state,
      installedIds: state.installedIds.filter((id) => id !== appId),
      layout: state.layout.filter((item) => item.appId !== appId),
    })
  }

  recordOpen(appId: string): PracticeWorkspaceState {
    if (!this.#byId.has(appId)) return this.repository.load()
    const state = this.repository.load()
    return this.#save({
      ...state,
      recent: [
        { appId, openedAt: this.now().toISOString() },
        ...state.recent.filter((entry) => entry.appId !== appId),
      ].slice(0, this.recentLimit),
    })
  }

  saveLayout(layout: readonly PracticeLayoutItem[]): PracticeWorkspaceState {
    const state = this.repository.load()
    return this.#save(normalizePraticiesState({ ...state, layout }, [...this.#byId.values()]))
  }

  #save(state: PracticeWorkspaceState): PracticeWorkspaceState {
    this.repository.save(state)
    return state
  }
}

export function createMemoryPraticiesRepository(
  initial?: unknown,
  catalog: readonly PracticeAppDefinition[] = DEFAULT_PRACTICE_APPS,
): PraticiesRepository {
  let state = normalizePraticiesState(initial, catalog)
  return {
    load: () => state,
    save: (next) => { state = normalizePraticiesState(next, catalog) },
  }
}

export function createStoredPraticiesRepository(
  store: KeyValueStore,
  catalog: readonly PracticeAppDefinition[] = DEFAULT_PRACTICE_APPS,
  key = "workspace",
): PraticiesRepository {
  return {
    load: () => normalizePraticiesState(store.get<unknown>(key), catalog),
    save: (state) => store.set(key, normalizePraticiesState(state, catalog)),
  }
}
