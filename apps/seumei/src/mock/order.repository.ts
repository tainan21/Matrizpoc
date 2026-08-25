import type { KeyValueStore } from "@matriz/platform-storage"
import type { MembershipRepository } from "../domains/memberships/domain/membership.repository"
import type {
  OrderRepository,
  TenantOrderRepository,
} from "../domains/orders/domain/order.repository"
import { asOrderId, type Order } from "../domains/orders/domain/order"

const ORDERS_KEY = "orders:v1"

export function createFixtureOrderRepository(input: {
  readonly memberships: MembershipRepository
  readonly storage: KeyValueStore
  readonly createOrderId?: () => ReturnType<typeof asOrderId>
  readonly now?: () => string
}): OrderRepository {
  const createOrderId =
    input.createOrderId ?? (() => asOrderId(`order-${crypto.randomUUID()}`))
  const now = input.now ?? (() => new Date().toISOString())
  let orders = input.storage.get<Order[]>(ORDERS_KEY) ?? []

  function persist() {
    input.storage.set(ORDERS_KEY, orders)
  }

  return {
    async create(publication, draft) {
      const timestamp = now()
      const order: Order = {
        id: createOrderId(),
        companyId: publication.companyId,
        storeId: publication.storeId,
        customerName: draft.customerName.trim(),
        status: "placed",
        items: draft.items.map((item) => ({
          ...item,
          modifierNames: [...item.modifierNames],
        })),
        subtotalCents: draft.subtotalCents,
        deliveryFeeCents: draft.deliveryFeeCents,
        totalCents: draft.totalCents,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      orders = [...orders, order]
      persist()
      return order
    },

    async bind(context) {
      const membership = await input.memberships.find(context.userId, context.companyId)
      if (
        !membership ||
        membership.id !== context.membershipId ||
        membership.status !== "active"
      ) {
        return null
      }

      const bound: TenantOrderRepository = {
        async list() {
          return orders.filter((order) => order.companyId === context.companyId)
        },
        async find(orderId) {
          return (
            orders.find(
              (order) => order.companyId === context.companyId && order.id === orderId,
            ) ?? null
          )
        },
        async setStatus(orderId, status) {
          const existing = orders.find(
            (order) => order.companyId === context.companyId && order.id === orderId,
          )
          if (!existing) return null
          const updated: Order = { ...existing, status, updatedAt: now() }
          orders = orders.map((order) => (order.id === existing.id ? updated : order))
          persist()
          return updated
        },
      }
      return bound
    },
  }
}

