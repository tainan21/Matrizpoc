/**
 * MatrizLib bootstrap (L11).
 *
 * The public portal produces no product events. It composes the standard
 * registry, onboarding, telemetry, and event-bus public integrations once.
 */
import { getGlobalOnboardingStore, registerAppStep } from "@matriz/flows-onboarding"
import { asAppId } from "@matriz/foundation-types"
import { appOnboardingPayloadSchemas } from "@matriz/integration-api-contracts"
import { getGlobalEventBus } from "@matriz/integration-events"
import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { monorepoConfig } from "@matriz/platform-config"
import {
  createTelemetryClient,
  registerTelemetryClient,
  type TelemetryClient,
} from "@matriz/platform-telemetry"
import { manifest } from "../manifest/manifest"

const MATRIZLIB_APP_ID = asAppId("matrizlib")
let booted = false
let telemetry: TelemetryClient | undefined

export interface MatrizLibBootstrapConfig {
  readonly appId: string
}

export function getMatrizLibTelemetry(): TelemetryClient {
  if (!telemetry) {
    telemetry = createTelemetryClient(MATRIZLIB_APP_ID)
    registerTelemetryClient(telemetry)
  }
  return telemetry
}

export function bootstrap(): MatrizLibBootstrapConfig {
  if (!booted) {
    getGlobalRegistry().registerApp(manifest, {
      baseUrl: monorepoConfig.baseUrls.matrizlib,
      enabled: true,
    })

    getGlobalOnboardingStore()
    registerAppStep(MATRIZLIB_APP_ID, {
      title: "Conheça a MatrizLib",
      description: "Referências públicas de componentes, temas e arquitetura.",
      payloadSchema: appOnboardingPayloadSchemas.matrizlib,
    })

    getMatrizLibTelemetry()
    getGlobalEventBus()
    booted = true
  }

  return { appId: manifest.appId }
}
