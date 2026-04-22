import type { TenantId, Brand, ISODateString, AppIdLiteral } from "@matriz/foundation-types"

export type ContractId = Brand<string, "ContractId">
export type ContractTemplateId = Brand<string, "ContractTemplateId">
export type CounterpartyId = Brand<string, "CounterpartyId">

/**
 * Status interno do Contract. Mapeado no toSummaryDTO para o enum publico
 * do DTO v1 (draft | active | completed | cancelled).
 */
export type ContractStatus = "draft" | "pending" | "signed" | "cancelled"

export interface ContractParty {
  readonly name: string
  readonly role: string
  readonly email?: string
}

export interface Contract {
  readonly id: ContractId
  readonly tenantId: TenantId
  readonly templateId: ContractTemplateId
  readonly counterpartyId: CounterpartyId
  readonly title: string
  readonly originApp: AppIdLiteral
  readonly externalReference?: string
  readonly status: ContractStatus
  readonly amount: number
  readonly currency: string
  readonly effectiveFrom: ISODateString
  readonly effectiveTo?: ISODateString
  readonly parties: readonly ContractParty[]
  readonly notes?: string
  readonly createdAt: ISODateString
  readonly updatedAt: ISODateString
}

export interface ContractTemplate {
  readonly id: ContractTemplateId
  readonly tenantId: TenantId
  readonly name: string
  readonly description: string
  readonly category: "performance" | "service" | "generic"
  readonly body: string
  readonly active: boolean
  readonly createdAt: ISODateString
}

export interface Counterparty {
  readonly id: CounterpartyId
  readonly tenantId: TenantId
  readonly displayName: string
  readonly document?: string
  readonly email?: string
  readonly phone?: string
  readonly createdAt: ISODateString
}
