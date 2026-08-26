import type { InstalledAppsState } from "../../domain/installable-apps"
import type { InstallableAppDefinition } from "../../integration/apps/installable-app-catalog"

export interface InstallableAppViewModel {
  readonly appId: string
  readonly name: string
  readonly description: string
  readonly baseUrl: string
  readonly glyph: string
  readonly accent: "health"
  readonly capabilities: readonly { readonly id: string; readonly name: string; readonly description: string }[]
  readonly installed: boolean
  readonly active: boolean
  readonly shellMutationId: "control.smart-app-rail" | null
}

export function toInstallableAppsViewModels(
  apps: readonly InstallableAppDefinition[],
  state: InstalledAppsState,
): readonly InstallableAppViewModel[] {
  return apps.map((app) => {
    const installed = state.installedIds.includes(app.manifest.appId)

    return {
      appId: app.manifest.appId,
      name: app.manifest.name,
      description: app.manifest.description,
      baseUrl: app.baseUrl,
      glyph: app.glyph,
      accent: app.accent,
      capabilities: app.manifest.capabilities.map((capability) => ({ ...capability })),
      installed,
      active: installed && state.activeAppId === app.manifest.appId,
      shellMutationId: installed ? app.mutationId : null,
    }
  })
}
