import type { CompanyId } from "../../companies/domain/company"

export type StoreId = string & { readonly __brand: "SeumeiStoreId" }

export function asStoreId(value: string): StoreId {
  return value as StoreId
}

export type StoreStatus = "draft" | "published" | "disabled"

export interface StoreConfiguration {
  readonly orderingEnabled: boolean
  readonly deliveryFeeCents: number
  readonly minimumOrderCents: number
  readonly estimatedDeliveryMinutes: readonly [number, number]
  readonly openingLabel: string
}

export interface StoreAppearance {
  readonly preset: "cosmic-food" | "minimal"
  readonly displayName: string
  readonly logoUrl: string
  readonly heroImageUrl: string
  readonly headline: string
  readonly description: string
  readonly accent: string
}

export interface Store {
  readonly id: StoreId
  readonly companyId: CompanyId
  readonly slug: string
  readonly status: StoreStatus
  readonly configuration: StoreConfiguration
  readonly appearance: StoreAppearance
}

export interface StorePublicationContext {
  readonly storeId: StoreId
  readonly companyId: CompanyId
  readonly slug: string
  readonly store: Store
}

