/**
 * Contracts — Bootstrap (L11).
 *
 * Consome DTOs vindos de outros apps via EventBus e materializa contratos
 * locais. Demonstra L6 (DTO -> DDD) no lado receiver.
 */
import { getGlobalRegistry } from "@matriz/integration-registry-core"
import { getGlobalEventBus } from "@matriz/integration-events"
import { monorepoConfig } from "@matriz/platform-config"
import { registerAppStep, getGlobalOnboardingStore } from "@matriz/flows-onboarding"
import { appOnboardingPayloadSchemas } from "@matriz/integration-api-contracts"
import { asAppId, asTenantId } from "@matriz/foundation-types"
import {
  createTelemetryClient,
  registerTelemetryClient,
  type TelemetryClient,
} from "@matriz/platform-telemetry"
import { manifest } from "../manifest/manifest"
import { getContractsContainer } from "../lib/container"

const CONTRACTS_APP_ID = asAppId("contracts")
let booted = false
let telemetry: TelemetryClient | undefined

export function getContractsTelemetry(): TelemetryClient {
  if (!telemetry) {
    telemetry = createTelemetryClient(CONTRACTS_APP_ID)
    registerTelemetryClient(telemetry)
  }
  return telemetry
}

export function bootstrapContracts(): { appId: string } {
  if (booted) return { appId: manifest.appId }
  booted = true

  const registry = getGlobalRegistry()
  registry.registerApp(manifest, {
    baseUrl: monorepoConfig.baseUrls.contracts,
    enabled: true,
  })

  getGlobalOnboardingStore()
  registerAppStep(CONTRACTS_APP_ID, {
    title: "Configuracao de contratos",
    description: "Templates, assinaturas e numeracao.",
    payloadSchema: appOnboardingPayloadSchemas.contracts,
  })

  const t = getContractsTelemetry()
  const bus = getGlobalEventBus()
  const container = getContractsContainer()
  bus.on("contract.created", (envelope) => {
    const { tenantId, contractId, originApp, title } = envelope.payload
    t.track({
      tenantId: asTenantId(tenantId),
      type: "contract.created",
      properties: { contractId, originApp, title },
    })
  })
  bus.on("contract.linked", (envelope) => {
    t.track({
      tenantId: asTenantId(envelope.tenantId),
      type: "contract.linked",
      properties: {
        contractId: envelope.payload.contractId,
        externalLinkId: envelope.payload.externalLinkId,
      },
    })
  })

  // Warm-up container (materializa seeds em memoria)
  void container.listContracts("tenant-acme" as never)

  return { appId: manifest.appId }
}
