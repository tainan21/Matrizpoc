/**
 * Matriz Hub — Bootstrap (L11 entry-point).
 *
 * Ponto unico de registro em runtime:
 *   1. carrega manifests via @apps/<app>/public-contract (L2/L3),
 *   2. registra cada manifest no Registry global,
 *   3. toca o EventBus global para garantir o mesmo singleton entre pages.
 *
 * Alias paths em tsconfig.base.json limitam "@apps/<app>/public-contract" ao
 * arquivo de manifest-only (L3). Nenhum src interno de outro app e acessado.
 */
import { manifest as hubManifest } from "../manifest/manifest"
import { manifest as identityManifest } from "@apps/matriz-identity/public-contract"
import { manifest as matrizlibManifest } from "@apps/matrizlib/public-contract"
import { manifest as desktopManifest } from "@apps/matriz-desktop/public-contract"
import { manifest as workbenchManifest } from "@apps/matriz-workbench/public-contract"
import { manifest as controlManifest } from "@apps/matriz-control/public-contract"
import { manifest as uninstallManifest } from "@apps/matriz-uninstall/public-contract"
import { manifest as sitesManifest } from "@apps/sites/public-contract"
import { manifest as spotManifest } from "@apps/spot/public-contract"
import { manifest as matrizAdminManifest } from "@apps/matriz-admin/public-contract"
import { manifest as matrizOpsManifest } from "@apps/matriz-ops/public-contract"
import { manifest as matrizPayManifest } from "@apps/matriz-pay/public-contract"
import { manifest as seumeiManifest } from "@apps/seumei/public-contract"
import { manifest as contractsManifest } from "@apps/contracts/public-contract"
import { manifest as willdashManifest } from "@apps/willdash/public-contract"
import { manifest as healthManifest } from "@apps/health/public-contract"
import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { getGlobalEventBus } from "@matriz/integration-events"
import { monorepoConfig } from "@matriz/platform-config"
import type { AppManifestDTO } from "@matriz/integration-api-contracts"
import { asAppId, asTenantId } from "@matriz/foundation-types"
import {
  createTelemetryClient,
  environmentTelemetryOptions,
  registerTelemetryClient,
  type TelemetryClient,
} from "@matriz/platform-telemetry"
import { runInstitutionalIngestion } from "../institutional/bootstrap"

const HUB_APP_ID = asAppId("matriz-hub")
let isBootstrapped = false
let institutionalBootstrapped = false
let telemetry: TelemetryClient | undefined

export function getHubTelemetry(): TelemetryClient {
  if (!telemetry) {
    telemetry = createTelemetryClient(HUB_APP_ID, environmentTelemetryOptions())
    registerTelemetryClient(telemetry)
  }
  return telemetry
}

export interface HubBootstrapResult {
  readonly appId: string
  readonly registeredApps: readonly string[]
}

export function bootstrapMatrizHub(): HubBootstrapResult {
  const registry = getGlobalRegistry()

  if (!isBootstrapped) {
    const manifests: AppManifestDTO[] = [
      identityManifest,
      hubManifest,
      desktopManifest,
      matrizlibManifest,
      workbenchManifest,
      controlManifest,
      uninstallManifest,
      sitesManifest,
      spotManifest,
      matrizAdminManifest,
      matrizOpsManifest,
      matrizPayManifest,
      seumeiManifest,
      contractsManifest,
      willdashManifest,
      healthManifest,
    ]

    for (const m of manifests) {
      registry.registerApp(m, {
        baseUrl: monorepoConfig.baseUrls[m.appId],
        enabled: true,
      })
    }

    const t = getHubTelemetry()
    const bus = getGlobalEventBus()
    // Hub observa todos os eventos do ecossistema para popular /telemetry
    bus.on("hub.app.opened", (env) => {
      t.track({
        tenantId: asTenantId(env.tenantId),
        type: "hub.app.opened",
        properties: { appId: env.payload.appId },
        category: "ecosystem",
      })
    })
    bus.on("onboarding.completed", (env) => {
      t.track({
        tenantId: asTenantId(env.tenantId),
        type: "onboarding.completed",
        properties: { appId: env.payload.appId, steps: env.payload.completedSteps.length },
        category: "adoption",
      })
    })
    isBootstrapped = true
  }

  return {
    appId: hubManifest.appId,
    registeredApps: registry.listEnabled().map((e) => e.manifest.appId),
  }
}

/**
 * V1.2: ensure institutional ingestion ran at least once per process.
 * Idempotente: chame em RSC boundaries que consomem o InstitutionalRegistry.
 */
export async function ensureInstitutionalBootstrapped(): Promise<void> {
  if (institutionalBootstrapped) return
  await runInstitutionalIngestion()
  institutionalBootstrapped = true
}

export { runInstitutionalIngestion }
