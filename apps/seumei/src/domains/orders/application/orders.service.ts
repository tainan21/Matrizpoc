import type { SeumeiTenantContext } from "../../memberships/domain/tenant-context"
import type { OrderRepository } from "../domain/order.repository"
import type { Order, OrderId, OrderStatus } from "../domain/order"

export type OrdersError = "forbidden" | "order-not-found" | "invalid-transition"

const NEXT_STATUSES: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  placed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered"],
  delivered: [],
  cancelled: [],
}

export interface OrdersService {
  getOrders(context: SeumeiTenantContext): Promise<{ readonly ok: true; readonly orders: readonly Order[] } | { readonly ok: false; readonly error: OrdersError }>
  setStatus(context: SeumeiTenantContext, orderId: OrderId, status: OrderStatus): Promise<{ readonly ok: true; readonly order: Order } | { readonly ok: false; readonly error: OrdersError }>
}

export function createOrdersService(repository: OrderRepository): OrdersService {
  return {
    async getOrders(context) {
      if (!context.permissions.includes("orders.view")) return { ok: false, error: "forbidden" }
      const orders = await repository.bind(context)
      if (!orders) return { ok: false, error: "forbidden" }
      return { ok: true, orders: await orders.list() }
    },
    async setStatus(context, orderId, status) {
      if (!context.permissions.includes("orders.view") || !["owner", "admin"].includes(context.role)) return { ok: false, error: "forbidden" }
      const orders = await repository.bind(context)
      if (!orders) return { ok: false, error: "forbidden" }
      const current = await orders.find(orderId)
      if (!current) return { ok: false, error: "order-not-found" }
      if (!NEXT_STATUSES[current.status].includes(status)) return { ok: false, error: "invalid-transition" }
      const updated = await orders.setStatus(orderId, status)
      return updated ? { ok: true, order: updated } : { ok: false, error: "order-not-found" }
    },
  }
}
