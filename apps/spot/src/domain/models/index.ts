/**
 * Spot domain models (internal).
 *
 * Estas entidades sao INTERNAS ao app Spot. Nenhum outro app pode
 * importa-las (L3/L4). Quando precisarem trafegar entre apps, devem
 * passar por um DTO publico de `@matriz/integration-api-contracts`.
 */
import type { ISODateString, TenantId } from "@matriz/foundation-types"

export type BandId = string & { readonly __brand: "BandId" }
export type GigId = string & { readonly __brand: "GigId" }
export type ArtistProfileId = string & { readonly __brand: "ArtistProfileId" }
export type GigBookingId = string & { readonly __brand: "GigBookingId" }

export type GigStatus = "draft" | "published" | "booked" | "cancelled" | "finished"
export type BookingStatus = "pending" | "confirmed" | "rejected" | "cancelled"

export interface Band {
  id: BandId
  tenantId: TenantId
  name: string
  genre: string
  memberCount: number
  city: string
  description: string
  createdAt: ISODateString
}

export interface ArtistProfile {
  id: ArtistProfileId
  tenantId: TenantId
  bandId: BandId
  stageName: string
  bio: string
  avatarUrl?: string
  hasRider: boolean
  createdAt: ISODateString
}

export interface Gig {
  id: GigId
  tenantId: TenantId
  bandId: BandId
  title: string
  venue: string
  city: string
  scheduledFor: ISODateString
  durationMinutes: number
  cacheAmount: number
  currency: "BRL" | "USD"
  status: GigStatus
  notes?: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface GigBooking {
  id: GigBookingId
  tenantId: TenantId
  gigId: GigId
  establishmentExternalId?: string
  establishmentName?: string
  status: BookingStatus
  createdAt: ISODateString
}
