import type { Order, OrderId, OrderStatus } from "../domain/order"

const STATUS: Record<OrderStatus, { label: string; tone: string; next: OrderStatus | null; action: string | null }> = {
  placed: { label: "Novo pedido", tone: "purple", next: "preparing", action: "Iniciar preparo" },
  preparing: { label: "Em preparo", tone: "amber", next: "ready", action: "Marcar pronto" },
  ready: { label: "Pronto", tone: "blue", next: "delivered", action: "Confirmar entrega" },
  delivered: { label: "Entregue", tone: "green", next: null, action: null },
  cancelled: { label: "Cancelado", tone: "red", next: null, action: null },
}

function currency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100).replace(/\s/g, " ")
}

export interface OrderRowViewModel {
  readonly id: OrderId
  readonly shortId: string
  readonly customerName: string
  readonly itemSummary: string
  readonly itemCount: number
  readonly createdAtLabel: string
  readonly totalLabel: string
  readonly status: OrderStatus
  readonly statusLabel: string
  readonly statusTone: string
  readonly nextStatus: OrderStatus | null
  readonly nextActionLabel: string | null
}

export interface OrdersViewModel {
  readonly metrics: { readonly total: number; readonly open: number; readonly preparing: number; readonly ready: number; readonly revenueCents: number; readonly revenueLabel: string }
  readonly rows: readonly OrderRowViewModel[]
}

export function toOrdersViewModel(orders: readonly Order[]): OrdersViewModel {
  const ordered = [...orders].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  const revenueCents = ordered.reduce((sum, order) => sum + order.totalCents, 0)
  return {
    metrics: {
      total: ordered.length,
      open: ordered.filter((order) => !["delivered", "cancelled"].includes(order.status)).length,
      preparing: ordered.filter((order) => order.status === "preparing").length,
      ready: ordered.filter((order) => order.status === "ready").length,
      revenueCents,
      revenueLabel: currency(revenueCents),
    },
    rows: ordered.map((order) => {
      const status = STATUS[order.status]
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
      return {
        id: order.id,
        shortId: `#${order.id.split("-").at(-1)?.slice(-6)}`,
        customerName: order.customerName,
        itemSummary: order.items.map((item) => `${item.quantity}× ${item.productName}`).join(", "),
        itemCount,
        createdAtLabel: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(order.createdAt)),
        totalLabel: currency(order.totalCents),
        status: order.status,
        statusLabel: status.label,
        statusTone: status.tone,
        nextStatus: status.next,
        nextActionLabel: status.action,
      }
    }),
  }
}
