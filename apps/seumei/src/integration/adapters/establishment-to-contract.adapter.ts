/**
 * Establishment → Contract adapter.
 *
 * Converte entity interna `Establishment` em DTO publico
 * `CreateContractFromEstablishmentInput` para enviar ao app Contracts.
 */
import type {
  CreateContractFromEstablishmentInput,
  EstablishmentSummaryDTO,
} from "@matriz/integration-api-contracts"
import type { Establishment } from "../../domain/models"

export function establishmentToSummaryDTO(est: Establishment): EstablishmentSummaryDTO {
  return {
    id: est.id as unknown as string,
    tenantId: est.tenantId as unknown as string,
    name: est.name,
    type: est.type,
    address: est.address,
    ownerName: est.ownerName,
    serviceRadiusKm: est.serviceRadiusKm,
  }
}

export function establishmentToCreateContractInput(
  est: Establishment,
  opts: {
    counterpartyName: string
    counterpartyRole?: string
    serviceDescription: string
    templateId?: string
  },
): CreateContractFromEstablishmentInput {
  return {
    tenantId: est.tenantId as unknown as string,
    establishment: establishmentToSummaryDTO(est),
    counterpartyName: opts.counterpartyName,
    counterpartyRole: opts.counterpartyRole ?? "Provider",
    serviceDescription: opts.serviceDescription,
    templateId: opts.templateId,
  }
}
