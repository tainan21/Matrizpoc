import { describe, expect, it } from "vitest"
import type { FinanceOverviewResult, FinancialEntryRecord } from "../../domain/repositories/finance-repository"
import { toFinanceEntryViewModel, toFinanceOverviewViewModel } from "./finance.presenter"

const entry: FinancialEntryRecord = {
  id: "entry_1", tenantId: "tenant_secret", entryNumber: 7, kind: "EXPENSE", origin: "MANUAL", status: "OPEN",
  category: "OPERATIONS", title: "Gás da cozinha", description: null, amountCents: 12990, currency: "BRL",
  competenceDate: "2026-08-01", dueDate: "2026-08-20", paidAt: null, orderId: null, version: 2,
  createdByUserId: "owner", createdAt: "2026-08-01T12:00:00.000Z", updatedAt: "2026-08-01T12:00:00.000Z", events: [],
}

describe("finance presenter", () => {
  it("presents a concise overview without serializing tenant authority", () => {
    const result: FinanceOverviewResult = {
      overview: { realizedCashCents: 2990, receivableCents: 8000, payableCents: 12990, competenceResultCents: -10000, overdueCount: 1 },
      entries: [entry],
    }
    const view = toFinanceOverviewViewModel(result, "2026-08-24")
    expect(view.metrics.map((metric) => metric.value)).toEqual(["R$ 29,90", "R$ 80,00", "R$ 129,90", "-R$ 100,00"])
    expect(view.entries[0]).toMatchObject({ numberLabel: "#0007", statusLabel: "Em atraso", canManage: true })
    expect(JSON.stringify(view)).not.toContain("tenant_secret")
  })

  it("keeps order receipts immutable in the UI", () => {
    const view = toFinanceEntryViewModel({ ...entry, origin: "ORDER", kind: "INCOME", category: "SALES", orderId: "order_1" }, "2026-08-24")
    expect(view.originLabel).toBe("Pedido")
    expect(view.canManage).toBe(false)
  })
})
