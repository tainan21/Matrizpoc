import { describe, expect, it, vi } from "vitest"
import { PayOutboxPublisher, type ClaimedOutboxEvent, type PayOutboxRepository } from "./outbox-publisher"

const event: ClaimedOutboxEvent = {
  id: "outbox-1",
  eventName: "wallet.entry.posted",
  eventVersion: "v1",
  payload: { transactionId: "txn-1", walletId: "wallet-1", currency: "MTRZ", amountMinor: "10", correlationId: "corr-1" },
  occurredAt: new Date("2026-08-30T12:00:00.000Z"),
  attempts: 1,
}

function repository(events: ClaimedOutboxEvent[] = [event]): PayOutboxRepository & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    claim: async () => { calls.push("claim"); return events },
    markPublished: async (id) => { calls.push(`published:${id}`) },
    releaseForRetry: async (id) => { calls.push(`retry:${id}`) },
    markDeadLettered: async (id) => { calls.push(`dead:${id}`) },
    prune: async () => { calls.push("prune"); return 2 },
  }
}

describe("PayOutboxPublisher", () => {
  it("publishes the canonical envelope with Nats-Msg-Id and marks only after ACK", async () => {
    const repo = repository()
    const publish = vi.fn(async () => { repo.calls.push("ack") })
    const worker = new PayOutboxPublisher({ repository: repo, transport: { publish }, now: () => new Date("2026-08-30T12:01:00.000Z") })

    await expect(worker.runBatch()).resolves.toEqual({ claimed: 1, published: 1, retried: 0, deadLettered: 0 })
    expect(publish).toHaveBeenCalledWith({
      subject: "matriz.v1.pay.wallet.entry.posted",
      messageId: "outbox-1",
      data: expect.objectContaining({ id: "outbox-1", name: "wallet.entry.posted", sourceApp: "matriz-pay", tenantId: null, version: "v1", occurredAt: "2026-08-30T12:00:00.000Z" }),
    })
    expect(repo.calls).toEqual(["claim", "ack", "published:outbox-1"])
  })

  it("releases an event after transport failure without marking it published", async () => {
    const repo = repository()
    const worker = new PayOutboxPublisher({ repository: repo, transport: { publish: async () => { throw new Error("nats unavailable with payload") } }, now: () => new Date() })
    await expect(worker.runBatch()).resolves.toEqual({ claimed: 1, published: 0, retried: 1, deadLettered: 0 })
    expect(repo.calls).toEqual(["claim", "retry:outbox-1"])
  })

  it("sends poison events to the DLQ after the retry budget and marks only after its ACK", async () => {
    const poison = { ...event, attempts: 10 }
    const repo = repository([poison])
    const calls: string[] = []
    const worker = new PayOutboxPublisher({ repository: repo, transport: {
      publish: async () => { throw new Error("poison") },
      publishDeadLetter: async (message) => { calls.push(`dlq:${message.messageId}`) },
    }, now: () => new Date() })
    await expect(worker.runBatch()).resolves.toEqual({ claimed: 1, published: 0, retried: 0, deadLettered: 1 })
    expect(calls).toEqual(["dlq:outbox-1"])
    expect(repo.calls).toEqual(["claim", "dead:outbox-1"])
  })

  it("never marks dead-lettered when the DLQ is unavailable", async () => {
    const repo = repository([{ ...event, attempts: 10 }])
    const worker = new PayOutboxPublisher({ repository: repo, transport: { publish: async () => { throw new Error("poison") }, publishDeadLetter: async () => { throw new Error("dlq unavailable") } }, now: () => new Date() })
    await expect(worker.runBatch()).resolves.toEqual({ claimed: 1, published: 0, retried: 1, deadLettered: 0 })
    expect(repo.calls).toEqual(["claim", "retry:outbox-1"])
  })

  it("prunes only through the repository retention policy", async () => {
    const repo = repository([])
    const worker = new PayOutboxPublisher({ repository: repo, transport: { publish: async () => undefined }, now: () => new Date("2026-08-30T12:00:00.000Z") })
    await expect(worker.prune()).resolves.toBe(2)
    expect(repo.calls).toEqual(["prune"])
  })

  it("rejects event names outside the Pay manifest", async () => {
    const repo = repository([{ ...event, eventName: "tenant.deleted" }])
    const worker = new PayOutboxPublisher({ repository: repo, transport: { publish: async () => undefined }, now: () => new Date() })
    await expect(worker.runBatch()).resolves.toEqual({ claimed: 1, published: 0, retried: 0, deadLettered: 1 })
    expect(repo.calls).toEqual(["claim", "dead:outbox-1"])
  })
})
