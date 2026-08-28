import type { InstalledAppsState } from "../../domain/installable-apps"
import type { StoreAppSnapshot } from "../../domain/desktop-bridge"
import type { InstallableAppDefinition } from "../../integration/apps/installable-app-catalog"

export interface InstallableAppViewModel {
  readonly appId: string
  readonly projectId: string
  readonly name: string
  readonly description: string
  readonly baseUrl: string
  readonly glyph: string
  readonly accent: "health" | "workbench" | "seumei" | "uninstall"
  readonly kind: "activation" | "windows_installer"
  readonly capabilities: readonly { readonly id: string; readonly name: string; readonly description: string }[]
  readonly installed: boolean
  readonly active: boolean
  readonly nativeState: StoreAppSnapshot["state"] | null
  readonly availableVersion: string | null
  readonly bytesDownloaded: number
  readonly totalBytes: number | null
  readonly statusMessage: string
  readonly shellMutationId: "control.smart-app-rail" | null
}

export function toInstallableAppsViewModels(
  apps: readonly InstallableAppDefinition[],
  state: InstalledAppsState,
  nativeSnapshots: readonly StoreAppSnapshot[] = [],
): readonly InstallableAppViewModel[] {
  return apps.map((app) => {
    const native = nativeSnapshots.find((snapshot) => snapshot.appId === app.manifest.appId) ?? null
    const installed = app.kind === "activation"
      ? state.installedIds.includes(app.manifest.appId)
      : native?.state === "installed" || native?.state === "update_available"

    return {
      appId: app.manifest.appId,
      projectId: app.projectId,
      name: app.manifest.name,
      description: app.manifest.description,
      baseUrl: app.baseUrl,
      glyph: app.glyph,
      accent: app.accent,
      kind: app.kind,
      capabilities: app.manifest.capabilities.map((capability) => ({ ...capability })),
      installed,
      active: installed && state.activeAppId === app.manifest.appId,
      shellMutationId: installed ? app.mutationId : null,
      nativeState: native?.state ?? (app.kind === "windows_installer" ? "unavailable" : null),
      availableVersion: native?.availableVersion ?? null,
      bytesDownloaded: native?.bytesDownloaded ?? 0,
      totalBytes: native?.totalBytes ?? null,
      statusMessage: native?.message ?? (app.kind === "activation" ? "Disponível no Control." : "Instalação nativa disponível somente no aplicativo Windows."),
    }
  })
}
