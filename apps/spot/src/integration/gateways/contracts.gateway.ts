/**
 * Contracts gateway (Spot → Contracts).
 *
 * Canal unico pelo qual o Spot fala com o app Contracts. Oferece 2
 * implementacoes:
 *
 * - HTTP: real (em prod, fala com a rota /api/contracts do app Contracts).
 * - In-browser bus: simula o request no client emitindo um evento no
 *   barramento global. O app Contracts, rodando no mesmo browser, reage.
 *
 * A escolha da implementacao eh feita em runtime.
 */
import type {
  CreateContractFromGigInput,
  ContractSummaryDTO,
} from "@matriz/integration-api-contracts"
import { asAppId } from "@matriz/foundation-types"
import { monorepoConfig } from "@matriz/platform-config"
import { getGlobalEventBus } from "@matriz/integration-events"

export interface ContractsGateway {
  requestContractFromGig(input: CreateContractFromGigInput): Promise<ContractSummaryDTO>
}

export function createHttpContractsGateway(): ContractsGateway {
  return {
    async requestContractFromGig(input) {
      const base = monorepoConfig.baseUrls.contracts
      const res = await fetch(`${base}/api/contracts/from-gig`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(`contracts gateway: ${res.status}`)
      return (await res.json()) as ContractSummaryDTO
    },
  }
}

export function createInBrowserContractsGateway(): ContractsGateway {
  const bus = getGlobalEventBus()
  return {
    async requestContractFromGig(input) {
      bus.emit("spot.gig.created", {
        sourceApp: asAppId("spot"),
        tenantId: input.tenantId,
        payload: {
          gigId: input.gig.id,
          tenantId: input.tenantId,
          title: input.gig.title,
          bandName: input.gig.bandName,
          venueName: input.gig.venueName,
        },
      })

      const now = new Date().toISOString()
      const summary: ContractSummaryDTO = {
        id: `ctr_${input.gig.id}`,
        tenantId: input.tenantId,
        title: `Contrato - ${input.gig.title}`,
        status: "draft",
        originApp: "spot",
        createdAt: now,
        parties: [
          { name: input.gig.bandName, role: "Artista" },
          { name: input.counterpartyName, role: input.counterpartyRole },
        ],
      }
      return summary
    },
  }
}

export function resolveContractsGateway(): ContractsGateway {
  if (typeof window !== "undefined") return createInBrowserContractsGateway()
  return createHttpContractsGateway()
}
