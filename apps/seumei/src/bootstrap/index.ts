/**
 * Seumei — Bootstrap (L11).
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

const SEUMEI_APP_ID = asAppId("seumei")
let booted = false
let telemetry: TelemetryClient | undefined

export function getSeumeiTelemetry(): TelemetryClient {
  if (!telemetry) {
    telemetry = createTelemetryClient(SEUMEI_APP_ID)
    registerTelemetryClient(telemetry)
  }
  return telemetry
}

export function bootstrapSeumei(): { appId: string } {
  if (booted) return { appId: manifest.appId }

  const registry = getGlobalRegistry()
  registry.registerApp(manifest, {
    baseUrl: monorepoConfig.baseUrls.seumei,
    enabled: true,
  })

  const t = getSeumeiTelemetry()
  const bus = getGlobalEventBus()
  bus.on("contract.created", (envelope) => {
    if (envelope.payload.originApp !== "seumei") return
    t.track({
      tenantId: asTenantId(envelope.tenantId),
      type: "seumei.contract.confirmed",
      properties: { contractId: envelope.payload.contractId },
    })
  })
  bus.on("seumei.establishment.selected", (envelope) => {
    t.track({
      tenantId: asTenantId(envelope.tenantId),
      type: "seumei.establishment.selected",
      properties: { establishmentId: envelope.payload.establishmentId, name: envelope.payload.name },
    })
  })

  registerAppStep(SEUMEI_APP_ID, {
    title: "Operacao do estabelecimento",
    description: "Tipo, regioes atendidas e modelo de operacao.",
    payloadSchema: appOnboardingPayloadSchemas.seumei,
  })

  booted = true
  return { appId: manifest.appId }
}
