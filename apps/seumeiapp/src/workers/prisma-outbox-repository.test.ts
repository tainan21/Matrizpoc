import { describe, expect, it, vi } from "vitest"
import { PrismaSeumeiOutboxRepository } from "./prisma-outbox-repository"

describe("PrismaSeumeiOutboxRepository", () => {
  it("claims multiple tenants with SKIP LOCKED through the worker-only client", async () => {
    const query = vi.fn(async () => [{ id: "event-1", tenantId: "tenant-a", eventName: "seumei.establishment.selected", eventVersion: "v1", payloadJson: { ok: true }, occurredAt: new Date(0), attempts: 2 }])
    const client = { $queryRawUnsafe: query, seumeiOutboxEvent: { updateMany: vi.fn(), deleteMany: vi.fn() } }
    const repository = new PrismaSeumeiOutboxRepository(client as never)
    await expect(repository.claim({ limit: 50, now: new Date(0), lockUntil: new Date(30_000) })).resolves.toEqual([expect.objectContaining({ tenantId: "tenant-a", payload: { ok: true } })])
    expect(query.mock.calls[0]?.[0]).toMatch(/FOR UPDATE SKIP LOCKED/)
    expect(query.mock.calls[0]?.[0]).toMatch(/attempts = candidate\.attempts \+ 1/)
  })

  it("prunes only published or dead-lettered records", async () => {
    const deleteMany = vi.fn(async () => ({ count: 2 }))
    const repository = new PrismaSeumeiOutboxRepository({ $queryRawUnsafe: vi.fn(), seumeiOutboxEvent: { updateMany: vi.fn(), deleteMany } } as never)
    await expect(repository.prune(new Date(100), new Date(200))).resolves.toBe(2)
    expect(deleteMany).toHaveBeenCalledWith({ where: { OR: [{ publishedAt: { lt: new Date(100) } }, { deadLetteredAt: { lt: new Date(200) } }] } })
  })
})
