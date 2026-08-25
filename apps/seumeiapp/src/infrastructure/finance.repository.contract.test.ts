import { describe, expect, it } from "vitest"
import { createFinanceRepository } from "./finance.repository"

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-a",
    tenantId: "tenant-a",
    entryNumber: 1,
    kind: "INCOME",
    origin: "ORDER",
    status: "PAID",
    category: "SALES",
    title: "Pedido #1",
    description: null,
    amountCents: 2990,
    currency: "BRL",
    competenceDate: new Date("2026-08-24T00:00:00.000Z"),
    dueDate: new Date("2026-08-24T00:00:00.000Z"),
    paidAt: new Date("2026-08-24T12:00:00.000Z"),
    orderId: "order-a",
    idempotencyKey: "order-receipt:order-a",
    version: 1,
    createdByUserId: "public:demo-store",
    createdAt: new Date("2026-08-24T12:00:00.000Z"),
    updatedAt: new Date("2026-08-24T12:00:00.000Z"),
    events: [{ id: "event-a", type: "CREATED", actorUserId: "public:demo-store", note: null, createdAt: new Date("2026-08-24T12:00:00.000Z") }],
    ...overrides,
  }
}

describe("finance repository tenant contract", () => {
  it("returns no record when a known entry belongs to another tenant", async () => {
    const records = [row({ id: "entry-b", tenantId: "tenant-b" })]
    const db = {
      financialEntry: {
        findFirst: async ({ where }: { where: { id: string; tenantId: string } }) =>
          records.find((item) => item.id === where.id && item.tenantId === where.tenantId) ?? null,
      },
    }

    const repository = createFinanceRepository(db as never)

    await expect(repository.findEntry("tenant-a", "entry-b")).resolves.toBeNull()
  })

  it("calculates an overview only from rows selected for the requested tenant", async () => {
    const records = [
      row(),
      row({ id: "entry-b", tenantId: "tenant-b", amountCents: 999900 }),
    ]
    const db = {
      financialEntry: {
        findMany: async ({ where }: { where: { tenantId: string } }) => records.filter((item) => item.tenantId === where.tenantId),
      },
    }

    const repository = createFinanceRepository(db as never)
    const result = await repository.listOverview("tenant-a", { competenceMonth: "2026-08" }, "2026-08-24")

    expect(result.overview.realizedCashCents).toBe(2990)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.tenantId).toBe("tenant-a")
  })

  it("creates a tenant-scoped manual entry with an audit event", async () => {
    const db = {
      $transaction: async (work: (tx: unknown) => Promise<unknown>) => work({
        financialEntry: {
          aggregate: async () => ({ _max: { entryNumber: 4 } }),
          create: async ({ data }: { data: Record<string, any> }) => row({
            id: "entry-manual",
            origin: data.origin,
            kind: data.kind,
            status: data.status,
            category: data.category,
            title: data.title,
            amountCents: data.amountCents,
            orderId: null,
            entryNumber: data.entryNumber,
            createdByUserId: data.createdByUserId,
            events: [{ id: "event-manual", type: "CREATED", actorUserId: data.createdByUserId, note: null, createdAt: new Date("2026-08-24T12:00:00.000Z") }],
          }),
        },
      }),
    }
    const repository = createFinanceRepository(db as never)

    const created = await repository.createManualEntry("tenant-a", "user-a", {
      kind: "EXPENSE",
      category: "OPERATIONS",
      title: "Aluguel",
      description: null,
      amountCents: 320000,
      competenceDate: "2026-08-24",
      dueDate: "2026-08-30",
      paidAt: null,
      idempotencyKey: "manual-rent-2026-08",
    })

    expect(created).toMatchObject({ tenantId: "tenant-a", entryNumber: 5, origin: "MANUAL", status: "OPEN", amountCents: 320000 })
    expect(created.events).toEqual([expect.objectContaining({ type: "CREATED", actorUserId: "user-a" })])
  })

  it("rejects changing an order-derived receipt", async () => {
    const db = {
      $transaction: async (work: (tx: unknown) => Promise<unknown>) => work({
        financialEntry: { findFirst: async () => row() },
      }),
    }
    const repository = createFinanceRepository(db as never)

    await expect(repository.transitionManualEntry("tenant-a", "entry-a", {
      expectedVersion: 1,
      status: "CANCELLED",
      occurredAt: "2026-08-24T13:00:00.000Z",
      actorUserId: "user-a",
      note: null,
    })).rejects.toThrow("Recebimentos de pedidos não podem ser alterados manualmente")
  })

  it("reports a stale version instead of overwriting a manual entry", async () => {
    const db = {
      $transaction: async (work: (tx: unknown) => Promise<unknown>) => work({
        financialEntry: {
          findFirst: async () => row({ origin: "MANUAL", status: "OPEN", orderId: null }),
          updateMany: async () => ({ count: 0 }),
        },
      }),
    }
    const repository = createFinanceRepository(db as never)

    await expect(repository.transitionManualEntry("tenant-a", "entry-a", {
      expectedVersion: 0,
      status: "PAID",
      occurredAt: "2026-08-24T13:00:00.000Z",
      actorUserId: "user-a",
      note: null,
    })).rejects.toThrow("O lançamento foi atualizado em outra sessão")
  })
})
