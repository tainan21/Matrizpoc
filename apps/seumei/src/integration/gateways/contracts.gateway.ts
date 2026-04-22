/**
 * Contracts gateway (Seumei → Contracts).
 */
import type {
  CreateContractFromEstablishmentInput,
  ContractSummaryDTO,
} from "@matriz/integration-api-contracts"
import { asAppId } from "@matriz/foundation-types"
import { monorepoConfig } from "@matriz/platform-config"
import { getGlobalEventBus } from "@matriz/integration-events"

export interface SeumeiContractsGateway {
  requestContractFromEstablishment(
    input: CreateContractFromEstablishmentInput,
  ): Promise<ContractSummaryDTO>
}

export function createHttpSeumeiContractsGateway(): SeumeiContractsGateway {
  return {
    async requestContractFromEstablishment(input) {
      const base = monorepoConfig.baseUrls.contracts
      const res = await fetch(`${base}/api/contracts/from-establishment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(`contracts gateway: ${res.status}`)
      return (await res.json()) as ContractSummaryDTO
    },
  }
}

export function createInBrowserSeumeiContractsGateway(): SeumeiContractsGateway {
  const bus = getGlobalEventBus()
  return {
    async requestContractFromEstablishment(input) {
      bus.emit("seumei.establishment.selected", {
        sourceApp: asAppId("seumei"),
        tenantId: input.tenantId,
        payload: {
          establishmentId: input.establishment.id,
          tenantId: input.tenantId,
          name: input.establishment.name,
        },
      })
      const now = new Date().toISOString()
      const summary: ContractSummaryDTO = {
        id: `ctr_${input.establishment.id}`,
        tenantId: input.tenantId,
        title: `Servico - ${input.establishment.name}`,
        status: "draft",
        originApp: "seumei",
        createdAt: now,
        parties: [
          { name: input.establishment.ownerName, role: "Prestador" },
          { name: input.counterpartyName, role: input.counterpartyRole },
        ],
      }
      return summary
    },
  }
}

export function resolveSeumeiContractsGateway(): SeumeiContractsGateway {
  if (typeof window !== "undefined") return createInBrowserSeumeiContractsGateway()
  return createHttpSeumeiContractsGateway()
}
