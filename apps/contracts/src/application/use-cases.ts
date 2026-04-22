import type { TenantId } from "@matriz/foundation-types"
import { asISODate } from "@matriz/foundation-types"
import type {
  ContractSummaryDTO,
  CreateContractFromGigInput,
  CreateContractFromEstablishmentInput,
} from "@matriz/integration-api-contracts"
import type {
  ContractRepository,
  ContractTemplateRepository,
  CounterpartyRepository,
} from "../domain/repositories"
import type { Contract, ContractId, ContractStatus } from "../domain/models"
import {
  gigInputToContract,
  establishmentInputToContract,
} from "../integration/adapters/input-to-contract.adapter"

const DTO_STATUS_MAP: Record<ContractStatus, ContractSummaryDTO["status"]> = {
  draft: "draft",
  pending: "active",
  signed: "completed",
  cancelled: "cancelled",
}

export interface ContractsUseCases {
  listContracts(tenantId: TenantId): Promise<Contract[]>
  getContract(tenantId: TenantId, id: ContractId): Promise<Contract | null>
  countByStatus(tenantId: TenantId): Promise<Record<string, number>>
  createFromGig(dto: CreateContractFromGigInput): Promise<Contract>
  createFromEstablishment(dto: CreateContractFromEstablishmentInput): Promise<Contract>
  changeStatus(tenantId: TenantId, id: ContractId, status: ContractStatus): Promise<Contract | null>
  toSummaryDTO(c: Contract): ContractSummaryDTO
}

export interface ContractsDeps {
  contracts: ContractRepository
  templates: ContractTemplateRepository
  counterparties: CounterpartyRepository
}

const OWNER_FALLBACK = "Tenant Owner"

export function createContractsUseCases(deps: ContractsDeps): ContractsUseCases {
  return {
    async listContracts(tenantId) {
      return deps.contracts.list(tenantId)
    },
    async getContract(tenantId, id) {
      return deps.contracts.getById(tenantId, id)
    },
    async countByStatus(tenantId) {
      return deps.contracts.countByStatus(tenantId)
    },
    async createFromGig(dto) {
      const tenantId = dto.tenantId as TenantId
      const [template] = await deps.templates.listActive(tenantId)
      if (!template) throw new Error(`no active template for tenant ${dto.tenantId}`)
      const counterparty = await deps.counterparties.upsertByName(tenantId, dto.counterpartyName)
      const entity = gigInputToContract(dto, {
        templateId: template.id,
        counterpartyId: counterparty.id,
        ownerName: OWNER_FALLBACK,
      })
      return deps.contracts.create(entity)
    },
    async createFromEstablishment(dto) {
      const tenantId = dto.tenantId as TenantId
      const [template] = await deps.templates.listActive(tenantId)
      if (!template) throw new Error(`no active template for tenant ${dto.tenantId}`)
      const counterparty = await deps.counterparties.upsertByName(tenantId, dto.counterpartyName)
      const entity = establishmentInputToContract(dto, {
        templateId: template.id,
        counterpartyId: counterparty.id,
        ownerName: OWNER_FALLBACK,
      })
      return deps.contracts.create(entity)
    },
    async changeStatus(tenantId, id, status) {
      const current = await deps.contracts.getById(tenantId, id)
      if (!current) return null
      const updated: Contract = {
        ...current,
        status,
        updatedAt: asISODate(new Date().toISOString()),
      }
      return deps.contracts.update(updated)
    },
    toSummaryDTO(c): ContractSummaryDTO {
      return {
        id: c.id,
        tenantId: c.tenantId,
        title: c.title,
        status: DTO_STATUS_MAP[c.status],
        originApp: c.originApp,
        createdAt: c.createdAt,
        parties: c.parties.map((p) => ({ name: p.name, role: p.role })),
      }
    },
  }
}
