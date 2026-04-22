import { asISODate } from "@matriz/foundation-types"
import type { TenantId } from "@matriz/foundation-types"
import type {
  CreateContractFromGigInput,
  CreateContractFromEstablishmentInput,
} from "@matriz/integration-api-contracts"
import { newContractId } from "../../mock/repositories"
import type { Contract, ContractTemplateId, CounterpartyId } from "../../domain/models"

interface BuildParams {
  templateId: ContractTemplateId
  counterpartyId: CounterpartyId
  ownerName: string
}

/**
 * Converte DTOs v1 em aggregate Contract local. Adapter reverso DTO -> DDD (L6).
 */
export function gigInputToContract(
  dto: CreateContractFromGigInput,
  params: BuildParams,
): Contract {
  const now = asISODate(new Date().toISOString())
  return {
    id: newContractId(),
    tenantId: dto.tenantId as TenantId,
    templateId: params.templateId,
    counterpartyId: params.counterpartyId,
    title: `Contrato show ${dto.gig.bandName} @ ${dto.gig.venueName}`,
    originApp: "spot",
    externalReference: dto.gig.id,
    status: "draft",
    amount: dto.gig.feeAmount,
    currency: dto.gig.currency,
    effectiveFrom: asISODate(dto.gig.startsAt),
    effectiveTo: asISODate(dto.gig.endsAt),
    parties: [
      { name: dto.counterpartyName, role: dto.counterpartyRole },
      { name: dto.gig.bandName, role: "Artist" },
    ],
    createdAt: now,
    updatedAt: now,
  }
}

export function establishmentInputToContract(
  dto: CreateContractFromEstablishmentInput,
  params: BuildParams,
): Contract {
  const now = asISODate(new Date().toISOString())
  return {
    id: newContractId(),
    tenantId: dto.tenantId as TenantId,
    templateId: params.templateId,
    counterpartyId: params.counterpartyId,
    title: `Servico - ${dto.establishment.name}`,
    originApp: "seumei",
    externalReference: dto.establishment.id,
    status: "draft",
    amount: 0, // servico pode ter valor variavel - DTO nao carrega fee
    currency: "BRL",
    effectiveFrom: now,
    parties: [
      { name: dto.counterpartyName, role: dto.counterpartyRole },
      { name: params.ownerName, role: "Owner" },
    ],
    notes: dto.serviceDescription,
    createdAt: now,
    updatedAt: now,
  }
}
