/**
 * Seumei mock repositories (L5).
 */
import type { KeyValueStore } from "@matriz/platform-storage"
import { createInMemoryStore } from "@matriz/platform-storage"
import type { TenantId } from "@matriz/foundation-types"
import type {
  Establishment,
  ServiceOffering,
  OwnerProfile,
  ServiceRequest,
  EstablishmentId,
} from "../domain/models"
import type {
  EstablishmentRepository,
  ServiceOfferingRepository,
  OwnerProfileRepository,
  ServiceRequestRepository,
} from "../domain/repositories"
import {
  SEED_ESTABLISHMENTS,
  SEED_SERVICE_OFFERINGS,
  SEED_OWNER_PROFILES,
} from "./seeds"

const EST_KEY = "seumei:establishments:v1"
const REQ_KEY = "seumei:requests:v1"

function ensureSeed(store: KeyValueStore): void {
  if (!store.get<readonly Establishment[]>(EST_KEY)) store.set(EST_KEY, SEED_ESTABLISHMENTS)
  if (!store.get<readonly ServiceRequest[]>(REQ_KEY)) store.set(REQ_KEY, [])
}

export function createSeumeiRepositories(store: KeyValueStore = createInMemoryStore()): {
  establishments: EstablishmentRepository
  offerings: ServiceOfferingRepository
  owners: OwnerProfileRepository
  requests: ServiceRequestRepository
} {
  ensureSeed(store)

  const getAll = (): readonly Establishment[] => store.get<readonly Establishment[]>(EST_KEY) ?? []
  const getAllRequests = (): readonly ServiceRequest[] =>
    store.get<readonly ServiceRequest[]>(REQ_KEY) ?? []

  const establishments: EstablishmentRepository = {
    async list(tenantId: TenantId) {
      return getAll().filter((e) => e.tenantId === tenantId)
    },
    async getById(tenantId, id) {
      return getAll().find((e) => e.tenantId === tenantId && e.id === id) ?? null
    },
    async update(est) {
      const all = getAll().map((e) => (e.id === est.id ? est : e))
      store.set(EST_KEY, all)
      return est
    },
  }

  const offerings: ServiceOfferingRepository = {
    async listByEstablishment(tenantId, establishmentId) {
      return SEED_SERVICE_OFFERINGS.filter(
        (o) => o.tenantId === tenantId && o.establishmentId === establishmentId,
      )
    },
  }

  const owners: OwnerProfileRepository = {
    async getByEstablishment(tenantId, establishmentId) {
      return (
        SEED_OWNER_PROFILES.find(
          (p) => p.tenantId === tenantId && p.establishmentId === establishmentId,
        ) ?? null
      )
    },
  }

  const requests: ServiceRequestRepository = {
    async listByEstablishment(tenantId, establishmentId) {
      return getAllRequests().filter(
        (r) => r.tenantId === tenantId && r.establishmentId === establishmentId,
      )
    },
    async create(req) {
      const all = [...getAllRequests(), req]
      store.set(REQ_KEY, all)
      return req
    },
  }

  return { establishments, offerings, owners, requests }
}

export { SEED_ESTABLISHMENTS, SEED_SERVICE_OFFERINGS, SEED_OWNER_PROFILES } from "./seeds"
export type { Establishment, ServiceOffering, OwnerProfile, EstablishmentId }
