/**
 * Willdash — Bootstrap (L11).
 *
 * Registra manifest, step de onboarding, TelemetryClient proprio e
 * handlers do EventBus. Emite eventos willdash.goal.opened e
 * willdash.activity.logged via use cases chamados na UI.
 */
import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { getGlobalEventBus } from "@matriz/integration-events"
import { monorepoConfig } from "@matriz/platform-config"
import { registerAppStep, getGlobalOnboardingStore } from "@matriz/flows-onboarding"
import { appOnboardingPayloadSchemas } from "@matriz/integration-api-contracts"
import { asAppId, asTenantId } from "@matriz/foundation-types"
import {
  createTelemetryClient,
  environmentTelemetryOptions,
  registerTelemetryClient,
  type TelemetryClient,
} from "@matriz/platform-telemetry"
import { manifest } from "../manifest/manifest"

const WILLDASH_APP_ID = asAppId("willdash")
let booted = false
let telemetry: TelemetryClient | undefined

export function getWilldashTelemetry(): TelemetryClient {
  if (!telemetry) {
    telemetry = createTelemetryClient(WILLDASH_APP_ID, environmentTelemetryOptions())
    registerTelemetryClient(telemetry)
  }
  return telemetry
}

export function bootstrapWilldash(): { appId: string } {
  if (booted) return { appId: manifest.appId }
  booted = true

  const registry = getGlobalRegistry()
  registry.registerApp(manifest, {
    baseUrl: monorepoConfig.baseUrls.willdash,
    enabled: true,
  })

  getGlobalOnboardingStore()
  registerAppStep(WILLDASH_APP_ID, {
    title: "Preferencias de metas",
    description: "Escolha quais metricas monitorar.",
    payloadSchema: appOnboardingPayloadSchemas.willdash,
  })

  const t = getWilldashTelemetry()
  const bus = getGlobalEventBus()

  // read-only: observa eventos do ecossistema e registra telemetria propria
  bus.on("contract.created", (env) => {
    t.track({
      tenantId: asTenantId(env.tenantId),
      type: "willdash.observed.contract.created",
      properties: { originApp: env.payload.originApp, contractId: env.payload.contractId },
    })
  })
  bus.on("onboarding.completed", (env) => {
    t.track({
      tenantId: asTenantId(env.tenantId),
      type: "willdash.observed.onboarding.completed",
      properties: { appId: env.payload.appId },
    })
  })

  return { appId: manifest.appId }
}
