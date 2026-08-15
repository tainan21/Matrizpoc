import {
  getThemeOffer,
  listCompatibleThemeOffers,
  resolveAppearance,
  themeOffers,
} from "@matriz/flows-themes"
import { DEFAULT_PRACTICE_APPS, PraticiesService, createMemoryPraticiesRepository, type PracticeWorkspaceState } from "@matriz/flows-praticies"
import type { MatrizAppId } from "@matriz/foundation-constants"

export interface CapabilityActor {
  readonly userId: string
  readonly tenantId: string
  readonly roles: readonly string[]
}

export interface CapabilityEvent {
  readonly name: string
  readonly occurredAt: string
  readonly metadata?: Readonly<Record<string, string>>
}

export interface CapabilityAppearance {
  readonly activeThemeKey: string
  readonly source: "base" | "user"
  readonly suggestedThemeKey?: string
  readonly fallbackApplied: boolean
  readonly persistence: "demo" | "database"
}

type Owner = "user" | "tenant"

function userKey(actor: CapabilityActor): string { return `${actor.tenantId}:${actor.userId}` }
function tenantKey(actor: CapabilityActor): string { return `tenant:${actor.tenantId}` }

export interface CapabilityStore {
  readonly persistence: "demo" | "database"
  resolveAppearance(actor: CapabilityActor, appId: MatrizAppId): CapabilityAppearance
  saveThemePreference(actor: CapabilityActor, appId: MatrizAppId, themeKey: string | undefined): CapabilityAppearance
  canUseTheme(actor: CapabilityActor, themeKey: string): boolean
  listThemes(actor: CapabilityActor, appId: MatrizAppId): ReadonlyArray<ReturnType<typeof listCompatibleThemeOffers>[number] & { readonly unlocked: boolean }>
  purchaseTheme(actor: CapabilityActor, themeKey: string, owner: Owner): void
  listEvents(actor: CapabilityActor): readonly CapabilityEvent[]
  getPraticies(actor: CapabilityActor): PracticeWorkspaceState
  installPracticy(actor: CapabilityActor, practicyKey: string): PracticeWorkspaceState
  uninstallPracticy(actor: CapabilityActor, practicyKey: string): PracticeWorkspaceState
  openPracticy(actor: CapabilityActor, practicyKey: string): PracticeWorkspaceState
  savePracticyLayout(actor: CapabilityActor, layout: PracticeWorkspaceState["layout"]): PracticeWorkspaceState
}

export function createDemoCapabilityStore(): CapabilityStore {
  const preferences = new Map<string, string>()
  const entitlements = new Map<string, Set<string>>()
  const events = new Map<string, CapabilityEvent[]>()
  const organizationThemes = new Map<string, string>([["tenant_demo", "aurora"]])
  const praticies = new Map<string, PraticiesService>()

  function actorPraticies(actor: CapabilityActor): PraticiesService {
    const key = userKey(actor)
    const current = praticies.get(key)
    if (current) return current
    const service = new PraticiesService(createMemoryPraticiesRepository(undefined, DEFAULT_PRACTICE_APPS), DEFAULT_PRACTICE_APPS)
    praticies.set(key, service)
    return service
  }

  function record(actor: CapabilityActor, event: CapabilityEvent): void {
    const key = userKey(actor)
    events.set(key, [event, ...(events.get(key) ?? [])].slice(0, 50))
  }

  function canUseTheme(actor: CapabilityActor, themeKey: string): boolean {
    if (themeKey === "matriz-base") return true
    return entitlements.get(userKey(actor))?.has(themeKey) === true || entitlements.get(tenantKey(actor))?.has(themeKey) === true
  }

  function resolve(actor: CapabilityActor, appId: MatrizAppId): CapabilityAppearance {
    const selected = preferences.get(`${userKey(actor)}:${appId}`)
    const organizationThemeKey = organizationThemes.get(actor.tenantId)
    const result = resolveAppearance({
      appId,
      catalog: themeOffers,
      userThemeKey: selected && canUseTheme(actor, selected) ? selected : undefined,
      organizationThemeKey,
    })
    return { ...result, persistence: "demo" }
  }

  return {
    persistence: "demo",
    resolveAppearance: resolve,
    saveThemePreference(actor, appId, themeKey) {
      if (themeKey && !canUseTheme(actor, themeKey)) throw new Error("Tema indisponível para esta pessoa.")
      const key = `${userKey(actor)}:${appId}`
      if (themeKey) preferences.set(key, themeKey)
      else preferences.delete(key)
      record(actor, { name: "theme.activated", occurredAt: new Date().toISOString(), metadata: themeKey ? { themeKey } : undefined })
      return resolve(actor, appId)
    },
    canUseTheme,
    listThemes(actor, appId) {
      return listCompatibleThemeOffers(appId).map((theme) => ({ ...theme, unlocked: canUseTheme(actor, theme.key) }))
    },
    purchaseTheme(actor, themeKey, owner) {
      const theme = getThemeOffer(themeKey)
      if (!theme || !theme.premium) throw new Error("Tema não está disponível para checkout demonstrativo.")
      if (owner === "tenant" && !actor.roles.some((role) => role === "owner" || role === "admin")) throw new Error("Somente administradores podem adquirir para a organização.")
      const key = owner === "tenant" ? tenantKey(actor) : userKey(actor)
      const next = entitlements.get(key) ?? new Set<string>()
      next.add(themeKey)
      entitlements.set(key, next)
      record(actor, { name: "theme.purchased", occurredAt: new Date().toISOString(), metadata: { themeKey, owner, mode: "demo" } })
    },
    listEvents(actor) { return events.get(userKey(actor)) ?? [] },
    getPraticies(actor) { return actorPraticies(actor).getState() },
    installPracticy(actor, practicyKey) {
      const next = actorPraticies(actor).install(practicyKey)
      record(actor, { name: "practicy.installed", occurredAt: new Date().toISOString(), metadata: { practicyKey } })
      return next
    },
    uninstallPracticy(actor, practicyKey) {
      const next = actorPraticies(actor).uninstall(practicyKey)
      record(actor, { name: "practicy.uninstalled", occurredAt: new Date().toISOString(), metadata: { practicyKey } })
      return next
    },
    openPracticy(actor, practicyKey) {
      const next = actorPraticies(actor).recordOpen(practicyKey)
      record(actor, { name: "practicy.opened", occurredAt: new Date().toISOString(), metadata: { practicyKey } })
      return next
    },
    savePracticyLayout(actor, layout) { return actorPraticies(actor).saveLayout(layout) },
  }
}

const globalStore = globalThis as typeof globalThis & { __matrizCapabilityStore?: CapabilityStore }
export const capabilityStore = globalStore.__matrizCapabilityStore ??= createDemoCapabilityStore()
