/**
 * Seumei repository interfaces (L5).
 *
 * Use cases dependem destas interfaces, nunca da implementacao.
 */
import type { TenantId } from "@matriz/foundation-types"
import type {
  Establishment,
  ServiceOffering,
  OwnerProfile,
  ServiceRequest,
  EstablishmentId,
} from "../models"

export interface EstablishmentRepository {
  list(tenantId: TenantId): Promise<readonly Establishment[]>
  getById(tenantId: TenantId, id: EstablishmentId): Promise<Establishment | null>
  update(est: Establishment): Promise<Establishment>
}

export interface ServiceOfferingRepository {
  listByEstablishment(
    tenantId: TenantId,
    establishmentId: EstablishmentId,
  ): Promise<readonly ServiceOffering[]>
}

export interface OwnerProfileRepository {
  getByEstablishment(
    tenantId: TenantId,
    establishmentId: EstablishmentId,
  ): Promise<OwnerProfile | null>
}

export interface ServiceRequestRepository {
  listByEstablishment(
    tenantId: TenantId,
    establishmentId: EstablishmentId,
  ): Promise<readonly ServiceRequest[]>
  create(req: ServiceRequest): Promise<ServiceRequest>
}
