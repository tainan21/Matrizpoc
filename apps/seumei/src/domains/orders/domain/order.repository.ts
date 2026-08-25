import type { SeumeiTenantContext } from "../../memberships/domain/tenant-context"
import type { StorePublicationContext } from "../../store/domain/store"
import type { CreateOrderDraft, Order, OrderId, OrderStatus } from "./order"

export interface TenantOrderRepository {
  list(): Promise<readonly Order[]>
  find(orderId: OrderId): Promise<Order | null>
  setStatus(orderId: OrderId, status: OrderStatus): Promise<Order | null>
}

export interface OrderRepository {
  create(publication: StorePublicationContext, draft: CreateOrderDraft): Promise<Order>
  bind(context: SeumeiTenantContext): Promise<TenantOrderRepository | null>
}

