import type { TenantId } from "@matriz/foundation-types"
import type { Contract, ContractId, ContractTemplate, ContractTemplateId, Counterparty, CounterpartyId } from "../models"

export interface ContractRepository {
  list(tenantId: TenantId): Promise<Contract[]>
  getById(tenantId: TenantId, id: ContractId): Promise<Contract | null>
  create(entity: Contract): Promise<Contract>
  update(entity: Contract): Promise<Contract>
  countByStatus(tenantId: TenantId): Promise<Record<string, number>>
}

export interface ContractTemplateRepository {
  list(tenantId: TenantId): Promise<ContractTemplate[]>
  getById(tenantId: TenantId, id: ContractTemplateId): Promise<ContractTemplate | null>
  listActive(tenantId: TenantId): Promise<ContractTemplate[]>
}

export interface CounterpartyRepository {
  list(tenantId: TenantId): Promise<Counterparty[]>
  getById(tenantId: TenantId, id: CounterpartyId): Promise<Counterparty | null>
  upsertByName(tenantId: TenantId, displayName: string): Promise<Counterparty>
}
