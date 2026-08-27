import type { AppManifestDTO } from "@matriz/integration-api-contracts"
import { localAppRuntimes, monorepoConfig } from "@matriz/platform-config"
import { manifest as healthManifest } from "@apps/health/public-contract"
import { manifest as workbenchManifest } from "@apps/matriz-workbench/public-contract"
import { manifest as seumeiManifest } from "@apps/seumei/public-contract"

export interface InstallableAppDefinition {
  readonly manifest: AppManifestDTO
  readonly projectId: string
  readonly baseUrl: string
  readonly glyph: string
  readonly accent: "health" | "workbench" | "seumei"
  readonly kind: "activation" | "windows_installer"
  readonly mutationId: "control.smart-app-rail" | null
  readonly releaseId: string | null
  readonly windows: {
    readonly appUserModelId: string
    readonly displayName: string
    readonly publisher: string
  } | null
}

const healthRuntime = localAppRuntimes.find((runtime) => runtime.appId === healthManifest.appId)

if (!healthRuntime) throw new Error("Health runtime is not registered")

export const INSTALLABLE_APPS: readonly InstallableAppDefinition[] = [{
  manifest: healthManifest,
  projectId: healthRuntime.slug,
  baseUrl: monorepoConfig.baseUrls[healthManifest.appId],
  glyph: "✚",
  accent: "health",
  kind: "activation",
  mutationId: "control.smart-app-rail",
  releaseId: null,
  windows: null,
}, {
  manifest: workbenchManifest,
  projectId: "matriz-workbench",
  baseUrl: "",
  glyph: "W",
  accent: "workbench",
  kind: "windows_installer",
  mutationId: null,
  releaseId: "matriz-workbench-windows-x64-stable",
  windows: { appUserModelId: "com.matriz.workbench", displayName: "Matriz Workbench", publisher: "Matriz" },
}, {
  manifest: seumeiManifest,
  projectId: "seumei",
  baseUrl: "",
  glyph: "S",
  accent: "seumei",
  kind: "windows_installer",
  mutationId: null,
  releaseId: "seumei-windows-x64-stable",
  windows: { appUserModelId: "com.matriz.seumei", displayName: "Seumei", publisher: "Matriz" },
}]
