import { generateId } from "@matriz/foundation-utils"
import type { TenantId } from "@matriz/foundation-types"
import { asISODate } from "@matriz/foundation-types"
import type {
  ContractRepository,
  ContractTemplateRepository,
  CounterpartyRepository,
} from "../domain/repositories"
import type {
  Contract,
  ContractId,
  ContractTemplate,
  ContractTemplateId,
  Counterparty,
  CounterpartyId,
} from "../domain/models"
import { seedContracts, seedCounterparties, seedTemplates } from "./seeds"

function filterByTenant<T extends { tenantId: TenantId }>(items: T[], tenantId: TenantId): T[] {
  return items.filter((i) => i.tenantId === tenantId)
}

export function createInMemoryContractRepository(initial: Contract[] = seedContracts): ContractRepository {
  let store = [...initial]
  return {
    async list(tenantId) {
      return filterByTenant(store, tenantId)
    },
    async getById(tenantId, id) {
      return store.find((c) => c.tenantId === tenantId && c.id === id) ?? null
    },
    async create(entity) {
      store = [...store, entity]
      return entity
    },
    async update(entity) {
      store = store.map((c) => (c.id === entity.id ? entity : c))
      return entity
    },
    async countByStatus(tenantId) {
      const filtered = filterByTenant(store, tenantId)
      const counters: Record<string, number> = { draft: 0, pending: 0, signed: 0, cancelled: 0 }
      for (const c of filtered) counters[c.status] = (counters[c.status] ?? 0) + 1
      return counters
    },
  }
}

export function createInMemoryContractTemplateRepository(
  initial: ContractTemplate[] = seedTemplates,
): ContractTemplateRepository {
  const store = [...initial]
  return {
    async list(tenantId) {
      return filterByTenant(store, tenantId)
    },
    async getById(tenantId, id) {
      return store.find((t) => t.tenantId === tenantId && t.id === id) ?? null
    },
    async listActive(tenantId) {
      return filterByTenant(store, tenantId).filter((t) => t.active)
    },
  }
}

export function createInMemoryCounterpartyRepository(
  initial: Counterparty[] = seedCounterparties,
): CounterpartyRepository {
  let store = [...initial]
  return {
    async list(tenantId) {
      return filterByTenant(store, tenantId)
    },
    async getById(tenantId, id) {
      return store.find((c) => c.tenantId === tenantId && c.id === id) ?? null
    },
    async upsertByName(tenantId, displayName) {
      const existing = store.find((c) => c.tenantId === tenantId && c.displayName === displayName)
      if (existing) return existing
      const created: Counterparty = {
        id: generateId("cp") as CounterpartyId,
        tenantId,
        displayName,
        createdAt: asISODate(new Date().toISOString()),
      }
      store = [...store, created]
      return created
    },
  }
}

/** IDs helpers for input adapter tests. */
export function newContractId(): ContractId {
  return generateId("ctr") as ContractId
}

export function newTemplateId(): ContractTemplateId {
  return generateId("tpl") as ContractTemplateId
}
