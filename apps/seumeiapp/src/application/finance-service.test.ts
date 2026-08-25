import { describe, expect, it, vi } from "vitest"
import type { AuthorizedCompanyContext } from "./company-onboarding"
import {
  FinanceCapabilityDeniedError,
  cancelManualFinanceEntry,
  createManualFinanceEntry,
  payManualFinanceEntry,
  readFinanceEntry,
  readFinanceOverview,
} from "./finance-service"
import type { FinanceRepository } from "../domain/repositories/finance-repository"

const company = { id: "company-a", tenantId: "tenant-a", name: "Galaxia", slug: "galaxia", createdByUserId: "user-a", status: "ACTIVE" as const, operationType: "PHYSICAL_STORE" as const, city: "SP", country: "BR", createdAt: "2026-08-24" }
function context(role: AuthorizedCompanyContext["role"]): AuthorizedCompanyContext { return { userId: "user-a", role, company } }
function repository(overrides: Partial<FinanceRepository> = {}): FinanceRepository {
  return {
    listOverview: vi.fn().mockResolvedValue({ overview: { realizedCashCents: 0, receivableCents: 0, payableCents: 0, competenceResultCents: 0, overdueCount: 0 }, entries: [] }),
    findEntry: vi.fn().mockResolvedValue(null),
    createManualEntry: vi.fn().mockResolvedValue({ id: "entry-a" }),
    transitionManualEntry: vi.fn().mockResolvedValue({ id: "entry-a", version: 2 }),
    reconcileOrderReceipt: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as FinanceRepository
}

describe("finance application service", () => {
  it("allows only owner and admin to read finance", async () => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      await expect(readFinanceOverview(context(role), "2026-08", "2026-08-24", repository())).resolves.toMatchObject({ entries: [] })
    }
    for (const role of ["MEMBER", "VIEWER"] as const) {
      const repo = repository()
      await expect(readFinanceOverview(context(role), "2026-08", "2026-08-24", repo)).rejects.toBeInstanceOf(FinanceCapabilityDeniedError)
      expect(repo.listOverview).not.toHaveBeenCalled()
    }
  })

  it("converts a localized decimal amount to integer cents before persistence", async () => {
    const createManualEntry = vi.fn().mockResolvedValue({ id: "entry-a" })
    const repo = repository({ createManualEntry })

    await createManualFinanceEntry(context("OWNER"), {
      title: " Aluguel ",
      description: " Ponto comercial ",
      kind: "EXPENSE",
      category: "OPERATIONS",
      amount: "3.200,50",
      competenceDate: "2026-08-01",
      dueDate: "2026-08-10",
      paid: false,
      idempotencyKey: "manual-rent-2026-08",
    }, repo, () => new Date("2026-08-24T12:00:00.000Z"))

    expect(createManualEntry).toHaveBeenCalledWith("tenant-a", "user-a", expect.objectContaining({
      title: "Aluguel",
      description: "Ponto comercial",
      amountCents: 320050,
      paidAt: null,
    }))
  })

  it("returns null for a known entry id outside the active tenant", async () => {
    const findEntry = vi.fn().mockResolvedValue(null)
    await expect(readFinanceEntry(context("ADMIN"), "entry-tenant-b", repository({ findEntry }))).resolves.toBeNull()
    expect(findEntry).toHaveBeenCalledWith("tenant-a", "entry-tenant-b")
  })

  it("pays and cancels only through versioned tenant-scoped commands", async () => {
    const transitionManualEntry = vi.fn().mockResolvedValue({ id: "entry-a", version: 2 })
    const repo = repository({ transitionManualEntry })
    const now = () => new Date("2026-08-24T12:00:00.000Z")

    await payManualFinanceEntry(context("ADMIN"), "entry-a", { expectedVersion: 1, note: "Pago no caixa" }, repo, now)
    await cancelManualFinanceEntry(context("OWNER"), "entry-b", { expectedVersion: 3, note: null }, repo, now)

    expect(transitionManualEntry).toHaveBeenNthCalledWith(1, "tenant-a", "entry-a", { expectedVersion: 1, status: "PAID", occurredAt: "2026-08-24T12:00:00.000Z", actorUserId: "user-a", note: "Pago no caixa" })
    expect(transitionManualEntry).toHaveBeenNthCalledWith(2, "tenant-a", "entry-b", { expectedVersion: 3, status: "CANCELLED", occurredAt: "2026-08-24T12:00:00.000Z", actorUserId: "user-a", note: null })
  })
})
