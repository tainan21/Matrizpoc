import type { CommerceOrderStatus } from "../commerce"

export interface StoreProductRecord {
  readonly productId: string; readonly variantId: string; readonly name: string; readonly description: string | null
  readonly priceCents: number; readonly imageUrl: string | null; readonly imageAlt: string | null; readonly availableQuantity: number
}
export interface PublishedStoreRecord {
  readonly tenantId: string; readonly companyId: string; readonly storeSlug: string; readonly displayName: string
  readonly description: string | null; readonly version: number; readonly products: readonly StoreProductRecord[]
}
export interface CheckoutCommand {
  readonly variantId: string; readonly quantity: number; readonly customer: { readonly name: string; readonly email: string; readonly phone: string | null }
  readonly idempotencyKey: string
}
export interface OrderRecord {
  readonly id: string; readonly tenantId: string; readonly orderNumber: number; readonly status: CommerceOrderStatus
  readonly customer: { readonly id: string; readonly name: string; readonly email: string | null; readonly phone: string | null }
  readonly subtotalCents: number; readonly totalCents: number; readonly currency: string; readonly version: number; readonly createdAt: string
  readonly items: readonly { readonly id: string; readonly name: string; readonly variantName: string; readonly quantity: number; readonly unitPriceCents: number; readonly totalCents: number }[]
  readonly timeline: readonly { readonly status: CommerceOrderStatus; readonly note: string | null; readonly createdAt: string }[]
}
export interface CustomerRecord {
  readonly id: string; readonly tenantId: string; readonly name: string; readonly email: string | null; readonly phone: string | null
  readonly orderCount: number; readonly totalSpentCents: number; readonly lastOrderAt: string | null
}

export interface CommerceRepository {
  publishStore(tenantId: string, companyId: string, input: { storeSlug: string; displayName: string; description: string | null }): Promise<PublishedStoreRecord>
  findPublishedStoreBySlug(storeSlug: string): Promise<PublishedStoreRecord | null>
  checkoutPublishedStore(storeSlug: string, command: CheckoutCommand): Promise<OrderRecord>
  listOrders(tenantId: string): Promise<readonly OrderRecord[]>
  findOrder(tenantId: string, orderId: string): Promise<OrderRecord | null>
  transitionOrder(tenantId: string, orderId: string, expectedVersion: number, status: CommerceOrderStatus, actorUserId: string): Promise<OrderRecord | null>
  listCustomers(tenantId: string): Promise<readonly CustomerRecord[]>
  findCustomer(tenantId: string, customerId: string): Promise<CustomerRecord | null>
}
