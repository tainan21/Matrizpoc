"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  activateApp,
  activateCapability,
  deactivateCapability,
  emptyInstalledAppsState,
  installApp,
  uninstallApp,
  type InstalledAppsState,
} from "../../domain/installable-apps"
import { createExtensionRegistry, CONTROL_EXTENSION_DEFINITIONS, type ExtensionNavigationGroup } from "../../modules/extensions/public"
import type { DesktopCommand, StoreAppSnapshot } from "../../domain/desktop-bridge"
import { INSTALLABLE_APPS } from "../../integration/apps/installable-app-catalog"
import { toInstallableAppsViewModels, type InstallableAppViewModel } from "./installable-apps-presenter"
import { readInstalledAppsState, writeInstalledAppsState, type InstalledAppsStorage } from "./installed-apps-storage"

interface InstalledAppsContextValue {
  readonly state: InstalledAppsState
  readonly apps: readonly InstallableAppViewModel[]
  readonly nativeSnapshots: readonly StoreAppSnapshot[]
  readonly install: (appId: string) => void
  readonly uninstall: (appId: string) => void
  readonly activateExtension: (appId: string) => void
  readonly deactivateExtension: (appId: string) => void
  readonly activate: (appId: string | null) => void
  readonly navigation: readonly ExtensionNavigationGroup[]
  readonly storeAction: (type: Extract<DesktopCommand["type"], `store.app.${string}`>, appId: "matriz-workbench" | "seumei" | "matriz-uninstall") => Promise<void>
}

const InstalledAppsContext = createContext<InstalledAppsContextValue | null>(null)
const allowedIds = INSTALLABLE_APPS.map((app) => app.manifest.appId)

export function InstalledAppsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InstalledAppsState>(emptyInstalledAppsState)
  const [nativeSnapshots, setNativeSnapshots] = useState<readonly StoreAppSnapshot[]>([])
  useEffect(() => {
    const storage = getBrowserStorage()
    if (storage) setState(readInstalledAppsState(storage, allowedIds))
  }, [])

  useEffect(() => {
    const bridge = window.matrizDesktop
    if (!bridge) return
    let active = true
    void bridge.invoke({ type: "store.apps.status" }).then((value) => { if (active && Array.isArray(value)) setNativeSnapshots(value as readonly StoreAppSnapshot[]) }).catch(() => { if (active) setNativeSnapshots([]) })
    return bridge.subscribe((event) => { if (active && event.type === "store.updated") setNativeSnapshots(event.snapshots) })
  }, [])

  const updateState = useCallback((update: (current: InstalledAppsState) => InstalledAppsState) => {
    setState((current) => {
      const next = update(current)
      const storage = getBrowserStorage()
      if (storage) {
        try { writeInstalledAppsState(storage, next) } catch { /* Browser privacy modes can deny persistence; the current session still works. */ }
      }
      return next
    })
  }, [])

  const navigation = useMemo(() => {
    const definitionIds = new Set(CONTROL_EXTENSION_DEFINITIONS.map((definition) => definition.id))
    const receipts = state.installedIds.filter((id) => definitionIds.has(id)).map((id) => ({ id, version: "0.1.0", state: state.activeIds.includes(id) ? "active" as const : "installed-inactive" as const, grantedPermissions: id === "health" ? ["system.metrics.read" as const] : [], installedAt: "local", updatedAt: "local" }))
    return createExtensionRegistry(CONTROL_EXTENSION_DEFINITIONS, "0.1.0", receipts).contributions.navigation
  }, [state.activeIds, state.installedIds])

  const value = useMemo<InstalledAppsContextValue>(() => ({
    state,
    apps: toInstallableAppsViewModels(INSTALLABLE_APPS, state, nativeSnapshots),
    nativeSnapshots,
    install: (appId) => updateState((current) => installApp(current, appId, allowedIds)),
    uninstall: (appId) => updateState((current) => uninstallApp(current, appId)),
    activateExtension: (appId) => updateState((current) => activateCapability(current, appId)),
    deactivateExtension: (appId) => updateState((current) => deactivateCapability(current, appId)),
    activate: (appId) => updateState((current) => activateApp(current, appId)),
    navigation,
    storeAction: async (type, appId) => {
      const bridge = window.matrizDesktop
      if (!bridge) return
      const value = await bridge.invoke({ type, appId } as DesktopCommand)
      if (Array.isArray(value)) setNativeSnapshots(value as readonly StoreAppSnapshot[])
    },
  }), [nativeSnapshots, navigation, state, updateState])

  return <InstalledAppsContext.Provider value={value}>{children}</InstalledAppsContext.Provider>
}

export function useInstalledApps(): InstalledAppsContextValue {
  const value = useContext(InstalledAppsContext)
  if (!value) throw new Error("useInstalledApps must be used within InstalledAppsProvider")
  return value
}

function getBrowserStorage(): InstalledAppsStorage | null {
  if (typeof window === "undefined") return null
  try { return window.localStorage } catch { return null }
}
