/**
 * Seumei domain models (internal).
 *
 * Entities INTERNAS ao app Seumei. Nenhum outro app deve importa-las
 * (L3/L4). Para tafego cross-app existe `EstablishmentSummaryDTO` em
 * `@matriz/integration-api-contracts`.
 */
import type { ISODateString, TenantId } from "@matriz/foundation-types"

export type EstablishmentId = string & { readonly __brand: "EstablishmentId" }
export type ServiceOfferingId = string & { readonly __brand: "ServiceOfferingId" }
export type OwnerProfileId = string & { readonly __brand: "OwnerProfileId" }
export type ServiceRequestId = string & { readonly __brand: "ServiceRequestId" }

export type EstablishmentStatus = "draft" | "active" | "paused"
export type ServiceRequestStatus = "pending" | "accepted" | "declined"

export interface Establishment {
  id: EstablishmentId
  tenantId: TenantId
  name: string
  type: string
  address: string
  city: string
  serviceRadiusKm: number
  status: EstablishmentStatus
  ownerName: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface ServiceOffering {
  id: ServiceOfferingId
  tenantId: TenantId
  establishmentId: EstablishmentId
  title: string
  description: string
  pricePerHour: number
  currency: "BRL" | "USD"
  createdAt: ISODateString
}

export interface OwnerProfile {
  id: OwnerProfileId
  tenantId: TenantId
  establishmentId: EstablishmentId
  ownerName: string
  email: string
  phone?: string
  bio: string
  createdAt: ISODateString
}

export interface ServiceRequest {
  id: ServiceRequestId
  tenantId: TenantId
  establishmentId: EstablishmentId
  requesterName: string
  requestedFor: ISODateString
  description: string
  status: ServiceRequestStatus
  createdAt: ISODateString
}
