/**
 * Spot bootstrap (L11).
 *
 * Ponto unico de registro em runtime:
 *  1. Registra manifest no registry global.
 *  2. Registra handlers de evento no bus.
 *  3. Registra extensao de onboarding.
 *  4. Inicializa container DI.
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
import { getSpotContainer } from "../lib/container"

const SPOT_APP_ID = asAppId("spot")

let booted = false
let telemetry: TelemetryClient | undefined

export function getSpotTelemetry(): TelemetryClient {
  if (!telemetry) {
    telemetry = createTelemetryClient(SPOT_APP_ID, environmentTelemetryOptions())
    registerTelemetryClient(telemetry)
  }
  return telemetry
}

export function bootstrapSpot(): { appId: string } {
  if (booted) return { appId: manifest.appId }

  const registry = getGlobalRegistry()
  registry.registerApp(manifest, {
    enabled: true,
    baseUrl: monorepoConfig.baseUrls[manifest.appId],
  })

  const t = getSpotTelemetry()
  const bus = getGlobalEventBus()
  bus.on("contract.created", (envelope) => {
    if (envelope.payload.originApp !== "spot") return
    t.track({
      tenantId: asTenantId(envelope.tenantId),
      type: "spot.contract.confirmed",
      properties: { contractId: envelope.payload.contractId },
    })
  })
  bus.on("spot.gig.created", (envelope) => {
    t.track({
      tenantId: asTenantId(envelope.tenantId),
      type: "spot.gig.created",
      properties: { gigId: envelope.payload.gigId },
    })
  })

  registerAppStep(SPOT_APP_ID, {
    title: "Perfil artistico",
    description: "Nome de palco, foco em bandas e preferencias.",
    payloadSchema: appOnboardingPayloadSchemas.spot,
  })

  getGlobalOnboardingStore()
  getSpotContainer()

  booted = true
  return { appId: manifest.appId }
}
