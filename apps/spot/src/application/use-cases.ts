/**
 * Spot use cases.
 *
 * Use cases dependem das interfaces em `domain/repositories`, nunca das
 * implementacoes mock. Isso garante troca para Prisma real sem refatorar.
 */
import { generateId } from "@matriz/foundation-utils"
import type { TenantId } from "@matriz/foundation-types"
import { asISODate } from "@matriz/foundation-types"
import type {
  GigRepository,
  BandRepository,
  ArtistProfileRepository,
} from "../domain/repositories"
import type { Band, Gig, GigId, BandId, GigStatus, ArtistProfile } from "../domain/models"

export interface CreateGigInput {
  tenantId: TenantId
  bandId: BandId
  title: string
  venue: string
  city: string
  scheduledFor: string
  durationMinutes: number
  cacheAmount: number
  currency: "BRL" | "USD"
  notes?: string
}

export interface SpotUseCases {
  listGigs(tenantId: TenantId): Promise<readonly Gig[]>
  getGig(tenantId: TenantId, id: GigId): Promise<Gig | null>
  createGig(input: CreateGigInput): Promise<Gig>
  publishGig(tenantId: TenantId, id: GigId): Promise<Gig | null>
  listBands(tenantId: TenantId): Promise<readonly Band[]>
  listArtistProfiles(tenantId: TenantId): Promise<readonly ArtistProfile[]>
}

export function createSpotUseCases(deps: {
  gigs: GigRepository
  bands: BandRepository
  profiles: ArtistProfileRepository
}): SpotUseCases {
  return {
    async listGigs(tenantId) {
      return deps.gigs.list(tenantId)
    },
    async getGig(tenantId, id) {
      return deps.gigs.getById(tenantId, id)
    },
    async createGig(input) {
      const now = asISODate(new Date().toISOString())
      const gig: Gig = {
        id: generateId("gig") as GigId,
        tenantId: input.tenantId,
        bandId: input.bandId,
        title: input.title,
        venue: input.venue,
        city: input.city,
        scheduledFor: asISODate(input.scheduledFor),
        durationMinutes: input.durationMinutes,
        cacheAmount: input.cacheAmount,
        currency: input.currency,
        status: "draft" as GigStatus,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      }
      return deps.gigs.create(gig)
    },
    async publishGig(tenantId, id) {
      const current = await deps.gigs.getById(tenantId, id)
      if (!current) return null
      const updated: Gig = {
        ...current,
        status: "published" as GigStatus,
        updatedAt: asISODate(new Date().toISOString()),
      }
      return deps.gigs.update(updated)
    },
    async listBands(tenantId) {
      return deps.bands.list(tenantId)
    },
    async listArtistProfiles(tenantId) {
      return deps.profiles.list(tenantId)
    },
  }
}
