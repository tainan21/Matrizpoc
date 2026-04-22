/**
 * Gig → Contract adapter.
 *
 * Transforma uma entity INTERNA do Spot (`Gig`) em um DTO PUBLICO
 * (`CreateContractFromGigInput`) para solicitar criacao de contrato no
 * app Contracts. O contrato publico nao expoe tipos internos (L3/L12).
 */
import type { CreateContractFromGigInput, GigSummaryDTO } from "@matriz/integration-api-contracts"
import type { Gig } from "../../domain/models"

/**
 * Calcula `endsAt` com base em `scheduledFor` + `durationMinutes`.
 */
function computeEndsAt(startIso: string, durationMinutes: number): string {
  const d = new Date(startIso)
  d.setMinutes(d.getMinutes() + durationMinutes)
  return d.toISOString()
}

export function gigToSummaryDTO(gig: Gig, bandName: string): GigSummaryDTO {
  return {
    id: gig.id as unknown as string,
    tenantId: gig.tenantId as unknown as string,
    title: gig.title,
    venueName: gig.venue,
    startsAt: gig.scheduledFor as unknown as string,
    endsAt: computeEndsAt(gig.scheduledFor as unknown as string, gig.durationMinutes),
    bandName,
    feeAmount: gig.cacheAmount,
    currency: gig.currency,
  }
}

export function gigToCreateContractInput(
  gig: Gig,
  opts: { bandName: string; counterpartyName: string; counterpartyRole?: string; templateId?: string },
): CreateContractFromGigInput {
  return {
    tenantId: gig.tenantId as unknown as string,
    gig: gigToSummaryDTO(gig, opts.bandName),
    counterpartyName: opts.counterpartyName,
    counterpartyRole: opts.counterpartyRole ?? "Venue",
    templateId: opts.templateId,
  }
}
