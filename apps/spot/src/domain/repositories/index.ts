/**
 * Spot repository interfaces (L5).
 *
 * Use cases dependem destas interfaces, NUNCA da implementacao mock.
 * A implementacao mock vive em `src/mock/repositories.ts`. No futuro,
 * uma implementacao Prisma conviveria ao lado em
 * `src/integration/gateways/prisma/*` sem alterar os use cases.
 */
import type { TenantId } from "@matriz/foundation-types"
import type { Band, Gig, GigBooking, ArtistProfile, GigId, BandId } from "../models"

export interface GigRepository {
  list(tenantId: TenantId): Promise<readonly Gig[]>
  getById(tenantId: TenantId, id: GigId): Promise<Gig | null>
  create(gig: Gig): Promise<Gig>
  update(gig: Gig): Promise<Gig>
}

export interface BandRepository {
  list(tenantId: TenantId): Promise<readonly Band[]>
  getById(tenantId: TenantId, id: BandId): Promise<Band | null>
}

export interface ArtistProfileRepository {
  list(tenantId: TenantId): Promise<readonly ArtistProfile[]>
  getByBandId(tenantId: TenantId, bandId: BandId): Promise<ArtistProfile | null>
}

export interface GigBookingRepository {
  listByGig(tenantId: TenantId, gigId: GigId): Promise<readonly GigBooking[]>
  create(booking: GigBooking): Promise<GigBooking>
}
