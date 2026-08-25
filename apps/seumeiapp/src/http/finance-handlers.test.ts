import { describe, expect, it, vi } from "vitest"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CompleteCoreAccessRepository } from "../domain/repositories/core-access-repository"
import type { FinanceRepository } from "../domain/repositories/finance-repository"
import { FinanceConflictError } from "../infrastructure/finance.repository"
import {
  cancelFinanceEntryHandler,
  createFinanceEntryHandler,
  listFinanceHandler,
  payFinanceEntryHandler,
  readFinanceEntryHandler,
} from "./finance-handlers"

const actor = { sessionUserId: "session-a", name: "Ana", email: "ana@example.com" }
const company = { id: "company-a", tenantId: "tenant-a", name: "Galaxia", slug: "galaxia", createdByUserId: "user-a", status: "ACTIVE" as const, operationType: "PHYSICAL_STORE" as const, city: "SP", country: "BR" }
function services(role: "OWNER" | "MEMBER" = "OWNER", financeOverrides: Partial<FinanceRepository> = {}) {
  return {
    core: {
      resolveUser: vi.fn().mockResolvedValue({ id: "user-a", name: "Ana", email: actor.email }),
      listSeumeiMemberships: vi.fn().mockResolvedValue([{ tenantId: "tenant-a", role }]),
    } as unknown as CompleteCoreAccessRepository,
    companies: { findByIdForTenantIds: vi.fn().mockResolvedValue(company) } as unknown as CompanyRepository,
    finance: {
      listOverview: vi.fn().mockResolvedValue({ overview: {}, entries: [] }),
      findEntry: vi.fn().mockResolvedValue(null),
      createManualEntry: vi.fn().mockResolvedValue({ id: "entry-a" }),
      transitionManualEntry: vi.fn().mockResolvedValue({ id: "entry-a" }),
      reconcileOrderReceipt: vi.fn().mockResolvedValue(null),
      ...financeOverrides,
    } as unknown as FinanceRepository,
  }
}

describe("finance HTTP boundaries", () => {
  it("rejects browser tenant authority before resolving membership", async () => {
    const svc = services()
    const result = await createFinanceEntryHandler(actor, "company-a", { tenantId: "tenant-b" }, svc)
    expect(result).toEqual({ status: 400, body: { error: "invalid_request" } })
    expect(svc.core.resolveUser).not.toHaveBeenCalled()
  })

  it("denies a member before any financial read", async () => {
    const svc = services("MEMBER")
    const result = await listFinanceHandler(actor, "company-a", "2026-08", svc, () => new Date("2026-08-24T12:00:00.000Z"))
    expect(result).toEqual({ status: 403, body: { error: "finance_forbidden" } })
    expect(svc.finance.listOverview).not.toHaveBeenCalled()
  })

  it("returns not found for a known foreign entry id", async () => {
    const result = await readFinanceEntryHandler(actor, "company-a", "entry-tenant-b", services())
    expect(result).toEqual({ status: 404, body: { error: "finance_not_found" } })
  })

  it("maps stale payment and cancellation commands to conflict", async () => {
    const transitionManualEntry = vi.fn().mockRejectedValue(new FinanceConflictError())
    const svc = services("OWNER", { transitionManualEntry })
    const body = { expectedVersion: 1, note: null }
    expect(await payFinanceEntryHandler(actor, "company-a", "entry-a", body, svc)).toEqual({ status: 409, body: { error: "finance_conflict" } })
    expect(await cancelFinanceEntryHandler(actor, "company-a", "entry-a", body, svc)).toEqual({ status: 409, body: { error: "finance_conflict" } })
  })
})
