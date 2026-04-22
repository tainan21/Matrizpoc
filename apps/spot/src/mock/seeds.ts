/**
 * Spot mock seeds (L5).
 *
 * Dados estaticos seguindo shape das entities. Nunca consumir
 * diretamente a partir de componentes ou hooks — sempre via
 * repository. Usa constructors branded (`asTenantId`, `asISODate`).
 */
import { asTenantId, asISODate } from "@matriz/foundation-types"
import type { Band, Gig, ArtistProfile, BandId, GigId, ArtistProfileId } from "../domain/models"

const TENANT_MATRIZ = asTenantId("tenant-matriz")
const TENANT_ACME = asTenantId("tenant-acme")

export const SEED_BANDS: readonly Band[] = [
  {
    id: "band-matriz-jazz" as BandId,
    tenantId: TENANT_MATRIZ,
    name: "Matriz Jazz Trio",
    genre: "Jazz",
    memberCount: 3,
    city: "Sao Paulo",
    description: "Trio instrumental com repertorio autoral e standards.",
    createdAt: asISODate("2025-01-15T10:00:00.000Z"),
  },
  {
    id: "band-noite-azul" as BandId,
    tenantId: TENANT_MATRIZ,
    name: "Noite Azul",
    genre: "MPB",
    memberCount: 5,
    city: "Rio de Janeiro",
    description: "Banda de MPB com apresentacoes em bares e clubes.",
    createdAt: asISODate("2025-02-02T09:30:00.000Z"),
  },
  {
    id: "band-acme-rock" as BandId,
    tenantId: TENANT_ACME,
    name: "Acme Rock",
    genre: "Rock",
    memberCount: 4,
    city: "Belo Horizonte",
    description: "Rock autoral, pegada classica.",
    createdAt: asISODate("2025-03-10T14:00:00.000Z"),
  },
]

export const SEED_ARTIST_PROFILES: readonly ArtistProfile[] = [
  {
    id: "profile-matriz-jazz" as ArtistProfileId,
    tenantId: TENANT_MATRIZ,
    bandId: "band-matriz-jazz" as BandId,
    stageName: "Matriz Jazz",
    bio: "Trio de jazz com 8 anos de estrada.",
    hasRider: true,
    createdAt: asISODate("2025-01-16T10:00:00.000Z"),
  },
  {
    id: "profile-noite-azul" as ArtistProfileId,
    tenantId: TENANT_MATRIZ,
    bandId: "band-noite-azul" as BandId,
    stageName: "Noite Azul",
    bio: "MPB autoral com influencias de samba e bossa.",
    hasRider: false,
    createdAt: asISODate("2025-02-03T09:30:00.000Z"),
  },
  {
    id: "profile-acme-rock" as ArtistProfileId,
    tenantId: TENANT_ACME,
    bandId: "band-acme-rock" as BandId,
    stageName: "Acme Rock",
    bio: "Quarteto de rock, repertorio autoral.",
    hasRider: true,
    createdAt: asISODate("2025-03-11T14:00:00.000Z"),
  },
]

export const SEED_GIGS: readonly Gig[] = [
  {
    id: "gig-matriz-001" as GigId,
    tenantId: TENANT_MATRIZ,
    bandId: "band-matriz-jazz" as BandId,
    title: "Jazz na Matriz - Sessao de Abril",
    venue: "Bar da Matriz",
    city: "Sao Paulo",
    scheduledFor: asISODate("2026-05-10T21:00:00.000Z"),
    durationMinutes: 120,
    cacheAmount: 2500,
    currency: "BRL",
    status: "published",
    createdAt: asISODate("2026-04-10T09:00:00.000Z"),
    updatedAt: asISODate("2026-04-10T09:00:00.000Z"),
  },
  {
    id: "gig-matriz-002" as GigId,
    tenantId: TENANT_MATRIZ,
    bandId: "band-noite-azul" as BandId,
    title: "Noite Azul - Domingos de MPB",
    venue: "Clube do Samba",
    city: "Rio de Janeiro",
    scheduledFor: asISODate("2026-05-17T19:30:00.000Z"),
    durationMinutes: 90,
    cacheAmount: 1800,
    currency: "BRL",
    status: "draft",
    createdAt: asISODate("2026-04-11T10:00:00.000Z"),
    updatedAt: asISODate("2026-04-11T10:00:00.000Z"),
  },
  {
    id: "gig-acme-001" as GigId,
    tenantId: TENANT_ACME,
    bandId: "band-acme-rock" as BandId,
    title: "Acme Rock - Release do Album",
    venue: "Arena BH",
    city: "Belo Horizonte",
    scheduledFor: asISODate("2026-06-01T22:00:00.000Z"),
    durationMinutes: 150,
    cacheAmount: 5000,
    currency: "BRL",
    status: "booked",
    createdAt: asISODate("2026-04-12T14:00:00.000Z"),
    updatedAt: asISODate("2026-04-12T14:00:00.000Z"),
  },
]
