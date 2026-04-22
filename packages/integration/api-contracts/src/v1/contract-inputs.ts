/**
 * CreateContractInput + CreateContractFromGigInput + CreateContractFromEstablishmentInput (v1).
 *
 * Inputs publicos consumidos pelo app Contracts. Origem vinda de Spot ou Seumei
 * chega sempre via DTO, nunca via import de internals do app de origem (L3).
 */
import { z } from "zod"
import { appIdSchema } from "./manifest"
import { gigSummarySchema, establishmentSummarySchema } from "./summaries"

export const contractPartyInputSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.string().email().optional(),
})
export type ContractPartyInputDTO = z.infer<typeof contractPartyInputSchema>

export const createContractInputSchema = z.object({
  tenantId: z.string().min(1),
  title: z.string().min(1),
  originApp: appIdSchema,
  parties: z.array(contractPartyInputSchema).min(2),
  templateId: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})
export type CreateContractInput = z.infer<typeof createContractInputSchema>

export const createContractFromGigInputSchema = z.object({
  tenantId: z.string().min(1),
  gig: gigSummarySchema,
  counterpartyName: z.string().min(1),
  counterpartyRole: z.string().min(1).default("Venue"),
  templateId: z.string().min(1).optional(),
})
export type CreateContractFromGigInput = z.infer<typeof createContractFromGigInputSchema>

export const createContractFromEstablishmentInputSchema = z.object({
  tenantId: z.string().min(1),
  establishment: establishmentSummarySchema,
  counterpartyName: z.string().min(1),
  counterpartyRole: z.string().min(1).default("Provider"),
  serviceDescription: z.string().min(1),
  templateId: z.string().min(1).optional(),
})
export type CreateContractFromEstablishmentInput = z.infer<
  typeof createContractFromEstablishmentInputSchema
>
