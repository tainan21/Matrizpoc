import { describe, expect, it, vi } from "vitest"
import { PrismaPayOutboxRepository } from "./prisma-outbox-repository"

describe("PrismaPayOutboxRepository", () => {
  it("claims with SKIP LOCKED and increments attempts atomically", async () => {
    const query = vi.fn(async () => [{ id: "event-1", eventName: "wallet.entry.posted", eventVersion: "v1", payloadJson: { ok: true }, occurredAt: new Date(0), attempts: 2 }])
    const client = { $queryRawUnsafe: query, payOutboxEvent: { updateMany: vi.fn(), deleteMany: vi.fn() } }
    const repository = new PrismaPayOutboxRepository(client as never)
    await expect(repository.claim({ limit: 25, now: new Date(0), lockUntil: new Date(30_000) })).resolves.toEqual([expect.objectContaining({ id: "event-1", payload: { ok: true }, attempts: 2 })])
    const [sql, limit, now, lockUntil] = query.mock.calls[0]! as unknown as [string, number, Date, Date]
    expect(sql).toMatch(/FOR UPDATE SKIP LOCKED/)
    expect(sql).toMatch(/attempts = candidate\.attempts \+ 1/)
    expect([limit, now, lockUntil]).toEqual([25, new Date(0), new Date(30_000)])
  })

  it("updates only a currently claimed unpublished row", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }))
    const client = { $queryRawUnsafe: vi.fn(), payOutboxEvent: { updateMany, deleteMany: vi.fn() } }
    const repository = new PrismaPayOutboxRepository(client as never)
    await repository.markPublished("event-1", new Date(100))
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "event-1", publishedAt: null, deadLetteredAt: null, lockedUntil: { not: null } }, data: { publishedAt: new Date(100), lockedUntil: null, nextAttemptAt: null, lastErrorCode: null } })
  })

  it("prunes only completed rows past their respective retention", async () => {
    const deleteMany = vi.fn(async () => ({ count: 3 }))
    const repository = new PrismaPayOutboxRepository({ $queryRawUnsafe: vi.fn(), payOutboxEvent: { updateMany: vi.fn(), deleteMany } } as never)
    await expect(repository.prune(new Date(100), new Date(200))).resolves.toBe(3)
    expect(deleteMany).toHaveBeenCalledWith({ where: { OR: [{ publishedAt: { lt: new Date(100) } }, { deadLetteredAt: { lt: new Date(200) } }] } })
  })

  it("fails closed if a state transition loses ownership of the row", async () => {
    const repository = new PrismaPayOutboxRepository({ $queryRawUnsafe: vi.fn(), payOutboxEvent: { updateMany: vi.fn(async () => ({ count: 0 })), deleteMany: vi.fn() } } as never)
    await expect(repository.markPublished("event-1", new Date())).rejects.toThrow(/claim was lost/i)
  })
})
