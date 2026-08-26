import type { AppManifestDTO } from "@matriz/integration-api-contracts"
import { localAppRuntimes, monorepoConfig } from "@matriz/platform-config"
import { manifest as healthManifest } from "@apps/health/public-contract"

export interface InstallableAppDefinition {
  readonly manifest: AppManifestDTO
  readonly projectId: string
  readonly baseUrl: string
  readonly glyph: string
  readonly accent: "health"
  readonly mutationId: "control.smart-app-rail"
}

const healthRuntime = localAppRuntimes.find((runtime) => runtime.appId === healthManifest.appId)

if (!healthRuntime) throw new Error("Health runtime is not registered")

export const INSTALLABLE_APPS: readonly InstallableAppDefinition[] = [{
  manifest: healthManifest,
  projectId: healthRuntime.slug,
  baseUrl: monorepoConfig.baseUrls[healthManifest.appId],
  glyph: "✚",
  accent: "health",
  mutationId: "control.smart-app-rail",
}]
