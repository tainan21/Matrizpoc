/**
 * Seumei use cases.
 */
import type { TenantId } from "@matriz/foundation-types"
import type {
  EstablishmentRepository,
  ServiceOfferingRepository,
  OwnerProfileRepository,
} from "../domain/repositories"
import type {
  Establishment,
  ServiceOffering,
  OwnerProfile,
  EstablishmentId,
} from "../domain/models"

export interface SeumeiUseCases {
  listEstablishments(tenantId: TenantId): Promise<readonly Establishment[]>
  getEstablishment(tenantId: TenantId, id: EstablishmentId): Promise<Establishment | null>
  listOfferings(tenantId: TenantId, id: EstablishmentId): Promise<readonly ServiceOffering[]>
  getOwnerProfile(tenantId: TenantId, id: EstablishmentId): Promise<OwnerProfile | null>
}

export function createSeumeiUseCases(deps: {
  establishments: EstablishmentRepository
  offerings: ServiceOfferingRepository
  owners: OwnerProfileRepository
}): SeumeiUseCases {
  return {
    async listEstablishments(tenantId) {
      return deps.establishments.list(tenantId)
    },
    async getEstablishment(tenantId, id) {
      return deps.establishments.getById(tenantId, id)
    },
    async listOfferings(tenantId, id) {
      return deps.offerings.listByEstablishment(tenantId, id)
    },
    async getOwnerProfile(tenantId, id) {
      return deps.owners.getByEstablishment(tenantId, id)
    },
  }
}
