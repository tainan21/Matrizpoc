import { describe, expect, it } from "vitest"
import {
  calculateFinanceOverview,
  requireFinancialEntryTransition,
  validateFinancialEntryDraft,
  type FinancialEntryForOverview,
} from "./finance"

describe("essential finance domain", () => {
  it("rejects zero, unsafe and negative monetary amounts", () => {
    const base = {
      kind: "EXPENSE" as const,
      origin: "MANUAL" as const,
      category: "OPERATIONS" as const,
      competenceDate: "2026-08-24",
      dueDate: "2026-08-24",
      status: "OPEN" as const,
      paidAt: null,
      orderId: null,
    }

    for (const amountCents of [0, -1, Number.MAX_SAFE_INTEGER + 1, 10.5]) {
      expect(() => validateFinancialEntryDraft({ ...base, amountCents })).toThrow("Valor financeiro inválido")
    }
  })

  it("requires coherent competence, due and payment dates", () => {
    expect(() => validateFinancialEntryDraft({
      kind: "INCOME",
      origin: "MANUAL",
      category: "OTHER",
      amountCents: 1000,
      competenceDate: "2026-08-25",
      dueDate: "2026-08-24",
      status: "OPEN",
      paidAt: null,
      orderId: null,
    })).toThrow("Vencimento não pode anteceder a competência")

    expect(() => validateFinancialEntryDraft({
      kind: "INCOME",
      origin: "MANUAL",
      category: "OTHER",
      amountCents: 1000,
      competenceDate: "2026-08-24",
      dueDate: "2026-08-24",
      status: "PAID",
      paidAt: null,
      orderId: null,
    })).toThrow("Pagamento obrigatório para lançamento pago")

    expect(() => validateFinancialEntryDraft({
      kind: "INCOME",
      origin: "MANUAL",
      category: "OTHER",
      amountCents: 1000,
      competenceDate: "2026-08-24",
      dueDate: "2026-08-24",
      status: "OPEN",
      paidAt: "2026-08-24T12:00:00.000Z",
      orderId: null,
    })).toThrow("Somente lançamento pago possui data de pagamento")
  })

  it("requires immutable sales income semantics for an order receipt", () => {
    const base = {
      origin: "ORDER" as const,
      amountCents: 2990,
      competenceDate: "2026-08-24",
      dueDate: "2026-08-24",
      status: "PAID" as const,
      paidAt: "2026-08-24T12:00:00.000Z",
      orderId: "order-a",
    }

    expect(validateFinancialEntryDraft({ ...base, kind: "INCOME", category: "SALES" })).toMatchObject(base)
    expect(() => validateFinancialEntryDraft({ ...base, kind: "EXPENSE", category: "SALES" })).toThrow("Recebimento de pedido inválido")
    expect(() => validateFinancialEntryDraft({ ...base, kind: "INCOME", category: "OTHER" })).toThrow("Recebimento de pedido inválido")
    expect(() => validateFinancialEntryDraft({ ...base, kind: "INCOME", category: "SALES", orderId: null })).toThrow("Recebimento de pedido inválido")
  })

  it("allows only open manual entries to become paid or cancelled", () => {
    expect(requireFinancialEntryTransition("OPEN", "PAID")).toBe("PAID")
    expect(requireFinancialEntryTransition("OPEN", "CANCELLED")).toBe("CANCELLED")
    expect(() => requireFinancialEntryTransition("PAID", "CANCELLED")).toThrow("Transição financeira inválida")
    expect(() => requireFinancialEntryTransition("CANCELLED", "PAID")).toThrow("Transição financeira inválida")
  })

  it("calculates realized cash, open balances, competence result and overdue count", () => {
    const entries: FinancialEntryForOverview[] = [
      { kind: "INCOME", status: "PAID", amountCents: 5000, competenceDate: "2026-08-10", dueDate: "2026-08-10", paidAt: "2026-08-10T12:00:00.000Z" },
      { kind: "EXPENSE", status: "PAID", amountCents: 1200, competenceDate: "2026-08-11", dueDate: "2026-08-11", paidAt: "2026-08-11T12:00:00.000Z" },
      { kind: "INCOME", status: "OPEN", amountCents: 2000, competenceDate: "2026-08-20", dueDate: "2026-08-30", paidAt: null },
      { kind: "EXPENSE", status: "OPEN", amountCents: 900, competenceDate: "2026-08-21", dueDate: "2026-08-23", paidAt: null },
      { kind: "INCOME", status: "CANCELLED", amountCents: 10000, competenceDate: "2026-08-22", dueDate: "2026-08-22", paidAt: null },
    ]

    expect(calculateFinanceOverview(entries, "2026-08-24", "2026-08")).toEqual({
      realizedCashCents: 3800,
      receivableCents: 2000,
      payableCents: 900,
      competenceResultCents: 4900,
      overdueCount: 1,
    })
  })
})
