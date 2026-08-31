import { describe, expect, it, vi } from "vitest"
import { createCompanySelectionRepository } from "./company-selection.repository"

describe("company selection outbox transaction", () => {
  it("revalidates, records selection and enqueues exactly once in one tenant transaction", async () => {
    const calls: string[] = []
    const tx = {
      $executeRawUnsafe: vi.fn(async () => { calls.push("tenant") }),
      company: { findFirst: vi.fn(async () => { calls.push("company"); return { id: "company-a", tenantId: "tenant-a", name: "A", slug: "a", createdByUserId: "user-a", status: "ACTIVE", operationType: null, city: null, country: "BR" } }) },
      seumeiCompanySelection: { upsert: vi.fn(async () => { calls.push("selection") }) },
      seumeiOutboxEvent: { upsert: vi.fn(async () => { calls.push("outbox") }) },
    }
    const db = { $transaction: async (work: (client: typeof tx) => Promise<unknown>) => work(tx) }
    const repository = createCompanySelectionRepository(db as never)

    await expect(repository.record({ tenantId: "tenant-a", userId: "user-a", companyId: "company-a" })).resolves.toMatchObject({ id: "company-a", tenantId: "tenant-a" })
    expect(calls).toEqual(["tenant", "company", "selection", "outbox"])
    expect(tx.seumeiOutboxEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { deduplicationKey: "selection:tenant-a:user-a:company-a" },
      create: expect.objectContaining({ eventName: "seumei.establishment.selected", tenantId: "tenant-a" }),
    }))
  })

  it("does not write selection or outbox when the company is not inside the authorized tenant", async () => {
    const tx = {
      $executeRawUnsafe: vi.fn(async () => undefined),
      company: { findFirst: vi.fn(async () => null) },
      seumeiCompanySelection: { upsert: vi.fn() },
      seumeiOutboxEvent: { upsert: vi.fn() },
    }
    const repository = createCompanySelectionRepository({ $transaction: async (work: (client: typeof tx) => Promise<unknown>) => work(tx) } as never)
    await expect(repository.record({ tenantId: "tenant-a", userId: "user-a", companyId: "foreign" })).rejects.toThrow(/not authorized/i)
    expect(tx.seumeiCompanySelection.upsert).not.toHaveBeenCalled()
    expect(tx.seumeiOutboxEvent.upsert).not.toHaveBeenCalled()
  })
})
