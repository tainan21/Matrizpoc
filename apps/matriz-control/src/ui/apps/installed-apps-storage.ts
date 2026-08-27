import { emptyInstalledAppsState, normalizeInstalledAppsState, type InstalledAppsState } from "../../domain/installable-apps"

export const INSTALLED_APPS_STORAGE_KEY = "matriz-control:installed-apps:v1"

export interface InstalledAppsStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function readInstalledAppsState(storage: InstalledAppsStorage, allowedIds: readonly string[]): InstalledAppsState {
  try {
    const stored = storage.getItem(INSTALLED_APPS_STORAGE_KEY)
    return normalizeInstalledAppsState(stored === null ? null : JSON.parse(stored), allowedIds)
  } catch {
    return emptyInstalledAppsState()
  }
}

export function writeInstalledAppsState(storage: InstalledAppsStorage, state: InstalledAppsState): void {
  storage.setItem(INSTALLED_APPS_STORAGE_KEY, JSON.stringify(state))
}
