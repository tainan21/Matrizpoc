/**
 * Spot mock repositories (L5).
 *
 * Implementa as interfaces de `src/domain/repositories`. Usa seeds +
 * KeyValueStore para persistir writes no browser entre navegacoes.
 */
import type { KeyValueStore } from "@matriz/platform-storage"
import { createInMemoryStore } from "@matriz/platform-storage"
import type { TenantId } from "@matriz/foundation-types"
import type { Band, Gig, GigBooking, ArtistProfile, GigId, BandId } from "../domain/models"
import type {
  GigRepository,
  BandRepository,
  ArtistProfileRepository,
  GigBookingRepository,
} from "../domain/repositories"
import { SEED_BANDS, SEED_GIGS, SEED_ARTIST_PROFILES } from "./seeds"

const GIGS_KEY = "spot:gigs:v1"
const BOOKINGS_KEY = "spot:bookings:v1"

function ensureSeed(store: KeyValueStore): void {
  if (!store.get<readonly Gig[]>(GIGS_KEY)) store.set(GIGS_KEY, SEED_GIGS)
  if (!store.get<readonly GigBooking[]>(BOOKINGS_KEY)) store.set(BOOKINGS_KEY, [])
}

export function createSpotRepositories(store: KeyValueStore = createInMemoryStore()): {
  gigs: GigRepository
  bands: BandRepository
  profiles: ArtistProfileRepository
  bookings: GigBookingRepository
} {
  ensureSeed(store)

  const getAllGigs = (): readonly Gig[] => store.get<readonly Gig[]>(GIGS_KEY) ?? []
  const getAllBookings = (): readonly GigBooking[] =>
    store.get<readonly GigBooking[]>(BOOKINGS_KEY) ?? []

  const gigs: GigRepository = {
    async list(tenantId: TenantId) {
      return getAllGigs().filter((g) => g.tenantId === tenantId)
    },
    async getById(tenantId, id) {
      return getAllGigs().find((g) => g.tenantId === tenantId && g.id === id) ?? null
    },
    async create(gig) {
      const all = [...getAllGigs(), gig]
      store.set(GIGS_KEY, all)
      return gig
    },
    async update(gig) {
      const all = getAllGigs().map((g) => (g.id === gig.id ? gig : g))
      store.set(GIGS_KEY, all)
      return gig
    },
  }

  const bands: BandRepository = {
    async list(tenantId) {
      return SEED_BANDS.filter((b) => b.tenantId === tenantId)
    },
    async getById(tenantId, id) {
      return SEED_BANDS.find((b) => b.tenantId === tenantId && b.id === id) ?? null
    },
  }

  const profiles: ArtistProfileRepository = {
    async list(tenantId) {
      return SEED_ARTIST_PROFILES.filter((p) => p.tenantId === tenantId)
    },
    async getByBandId(tenantId, bandId) {
      return (
        SEED_ARTIST_PROFILES.find((p) => p.tenantId === tenantId && p.bandId === bandId) ?? null
      )
    },
  }

  const bookings: GigBookingRepository = {
    async listByGig(tenantId, gigId) {
      return getAllBookings().filter((b) => b.tenantId === tenantId && b.gigId === gigId)
    },
    async create(booking) {
      const all = [...getAllBookings(), booking]
      store.set(BOOKINGS_KEY, all)
      return booking
    },
  }

  return { gigs, bands, profiles, bookings }
}

export { SEED_BANDS, SEED_GIGS, SEED_ARTIST_PROFILES } from "./seeds"
// Re-exported types for consumers that only want to type-check mock data.
export type { Band, Gig, GigBooking, ArtistProfile, GigId, BandId }
