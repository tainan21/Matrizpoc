import { describe, expect, it } from "vitest"
import { FIXTURE_ORDERS } from "../../../fixtures/orders"
import { toOrdersViewModel } from "./orders.presenter"

describe("orders presenter", () => {
  it("derives operational metrics and stable row labels from tenant orders", () => {
    const view = toOrdersViewModel(FIXTURE_ORDERS)

    expect(view.metrics).toEqual({ total: 5, open: 4, preparing: 1, ready: 1, revenueCents: 32820, revenueLabel: "R$ 328,20" })
    expect(view.rows[0]).toMatchObject({ shortId: "#1254", customerName: "Lucas Ferreira", statusLabel: "Novo pedido", nextStatus: "preparing", nextActionLabel: "Iniciar preparo" })
    expect(view.rows.at(-1)).toMatchObject({ statusLabel: "Entregue", nextStatus: null })
  })
})
