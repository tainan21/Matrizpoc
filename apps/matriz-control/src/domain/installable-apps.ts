export const INSTALLED_APPS_STATE_VERSION = 1 as const

export interface InstalledAppsState {
  readonly version: 1
  readonly installedIds: readonly string[]
  readonly activeAppId: string | null
}

export function emptyInstalledAppsState(): InstalledAppsState {
  return { version: INSTALLED_APPS_STATE_VERSION, installedIds: [], activeAppId: null }
}

export function normalizeInstalledAppsState(value: unknown, allowedIds: readonly string[]): InstalledAppsState {
  if (!isStoredState(value)) return emptyInstalledAppsState()

  const allowed = new Set(allowedIds)
  const installedIds = [...new Set(value.installedIds.filter((appId): appId is string => typeof appId === "string" && allowed.has(appId)))]
  const activeAppId = typeof value.activeAppId === "string" && installedIds.includes(value.activeAppId) ? value.activeAppId : null

  return { version: INSTALLED_APPS_STATE_VERSION, installedIds, activeAppId }
}

export function installApp(state: InstalledAppsState, appId: string, allowedIds: readonly string[]): InstalledAppsState {
  const normalized = normalizeInstalledAppsState(state, allowedIds)
  if (!allowedIds.includes(appId) || normalized.installedIds.includes(appId)) return normalized

  return { ...normalized, installedIds: [...normalized.installedIds, appId] }
}

export function uninstallApp(state: InstalledAppsState, appId: string): InstalledAppsState {
  const installedIds = state.installedIds.filter((installedAppId) => installedAppId !== appId)
  const activeAppId = state.activeAppId === appId ? null : state.activeAppId

  return { version: INSTALLED_APPS_STATE_VERSION, installedIds, activeAppId }
}

export function activateApp(state: InstalledAppsState, appId: string | null): InstalledAppsState {
  const activeAppId = appId !== null && state.installedIds.includes(appId) ? appId : null
  return { ...state, activeAppId }
}

function isStoredState(value: unknown): value is { version: unknown; installedIds: unknown[]; activeAppId?: unknown } {
  return typeof value === "object" && value !== null && "version" in value && "installedIds" in value && Array.isArray(value.installedIds)
}
