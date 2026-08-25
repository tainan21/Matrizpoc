import type { CompanyId } from "../../companies/domain/company"
import type { ProductId } from "../../catalog/domain/catalog"
import type { StoreId } from "../../store/domain/store"

export type OrderId = string & { readonly __brand: "SeumeiOrderId" }

export function asOrderId(value: string): OrderId {
  return value as OrderId
}

export type OrderStatus = "placed" | "preparing" | "ready" | "delivered" | "cancelled"

export interface OrderItem {
  readonly productId: ProductId
  readonly productName: string
  readonly quantity: number
  readonly unitPriceCents: number
  readonly modifierNames: readonly string[]
  readonly modifiersCents: number
  readonly totalCents: number
  readonly observation: string
}

export interface Order {
  readonly id: OrderId
  readonly companyId: CompanyId
  readonly storeId: StoreId
  readonly customerName: string
  readonly status: OrderStatus
  readonly items: readonly OrderItem[]
  readonly subtotalCents: number
  readonly deliveryFeeCents: number
  readonly totalCents: number
  readonly createdAt: string
  readonly updatedAt: string
}

export interface CreateOrderDraft {
  readonly customerName: string
  readonly items: readonly OrderItem[]
  readonly subtotalCents: number
  readonly deliveryFeeCents: number
  readonly totalCents: number
}

