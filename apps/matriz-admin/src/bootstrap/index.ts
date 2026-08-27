/**
 * Matriz Admin — Bootstrap (L11).
 *
 * Ponto de entrada unico em runtime. Chamado pelo `app/layout.tsx`.
 * Responsabilidades:
 *  1. Registrar o manifest no registry global.
 *  2. Registrar handlers de evento (bus.on).
 *  3. Registrar a extensao do onboarding compartilhado.
 */
import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { getGlobalEventBus } from "@matriz/integration-events"
import { monorepoConfig } from "@matriz/platform-config"
import { registerAppStep } from "@matriz/flows-onboarding"
import { appOnboardingPayloadSchemas } from "@matriz/integration-api-contracts"
import { asAppId, asTenantId } from "@matriz/foundation-types"
import {
  createTelemetryClient,
  registerTelemetryClient,
  type TelemetryClient,
} from "@matriz/platform-telemetry"
import { manifest } from "../manifest/manifest"

const MATRIZ_ADMIN_APP_ID = asAppId("matriz-admin")
let booted = false
let telemetry: TelemetryClient | undefined

export function getMatrizAdminTelemetry(): TelemetryClient {
  if (!telemetry) {
    telemetry = createTelemetryClient(MATRIZ_ADMIN_APP_ID)
    registerTelemetryClient(telemetry)
  }
  return telemetry
}

export function bootstrapMatrizAdmin(): { appId: string } {
  if (booted) return { appId: manifest.appId }

  const registry = getGlobalRegistry()
  registry.registerApp(manifest, {
    baseUrl: monorepoConfig.baseUrls["matriz-admin"],
    enabled: true,
  })

  const t = getMatrizAdminTelemetry()
  const bus = getGlobalEventBus()
  bus.on("contract.created", (envelope) => {
    if (envelope.payload.originApp !== "matriz-admin") return
    t.track({
      tenantId: asTenantId(envelope.tenantId),
      type: "matriz-admin.contract.confirmed",
      properties: { contractId: envelope.payload.contractId },
    })
  })
  registerAppStep(MATRIZ_ADMIN_APP_ID, {
    title: "Administracao Matriz",
    description: "Preferencias administrativas do ecossistema.",
    payloadSchema: appOnboardingPayloadSchemas["matriz-admin"],
  })

  booted = true
  return { appId: manifest.appId }
}
