"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import {
  activateApp,
  emptyInstalledAppsState,
  installApp,
  uninstallApp,
  type InstalledAppsState,
} from "../../domain/installable-apps"
import { INSTALLABLE_APPS } from "../../integration/apps/installable-app-catalog"
import { toInstallableAppsViewModels, type InstallableAppViewModel } from "./installable-apps-presenter"

interface InstalledAppsContextValue {
  readonly state: InstalledAppsState
  readonly apps: readonly InstallableAppViewModel[]
  readonly install: (appId: string) => void
  readonly uninstall: (appId: string) => void
  readonly activate: (appId: string | null) => void
}

const InstalledAppsContext = createContext<InstalledAppsContextValue | null>(null)
const allowedIds = INSTALLABLE_APPS.map((app) => app.manifest.appId)

export function InstalledAppsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InstalledAppsState>(emptyInstalledAppsState)
  const value = useMemo<InstalledAppsContextValue>(() => ({
    state,
    apps: toInstallableAppsViewModels(INSTALLABLE_APPS, state),
    install: (appId) => setState((current) => installApp(current, appId, allowedIds)),
    uninstall: (appId) => setState((current) => uninstallApp(current, appId)),
    activate: (appId) => setState((current) => activateApp(current, appId)),
  }), [state])

  return <InstalledAppsContext.Provider value={value}>{children}</InstalledAppsContext.Provider>
}

export function useInstalledApps(): InstalledAppsContextValue {
  const value = useContext(InstalledAppsContext)
  if (!value) throw new Error("useInstalledApps must be used within InstalledAppsProvider")
  return value
}
