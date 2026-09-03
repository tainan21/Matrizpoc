import { describe, expect, it, vi } from "vitest"
import {
  DurableInboxConsumer,
  DurableOutboxPublisher,
  ManagedJetStreamTransport,
  type ClaimedOutboxEvent,
  type InboxEnvelope,
  type InboxMessage,
  type InboxRepository,
  type OutboxRepository,
} from "./index"

const event: ClaimedOutboxEvent = {
  id: "outbox-1",
  eventName: "establishment.selected",
  eventVersion: "v1",
  tenantId: "tenant-a",
  payload: { establishmentId: "company-1" },
  occurredAt: new Date("2026-08-30T12:00:00.000Z"),
  attempts: 1,
}

function repository(events: readonly ClaimedOutboxEvent[] = [event]): OutboxRepository & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    claim: async () => { calls.push("claim"); return events },
    markPublished: async (id) => { calls.push(`published:${id}`) },
    releaseForRetry: async (id) => { calls.push(`retry:${id}`) },
    markDeadLettered: async (id) => { calls.push(`dead:${id}`) },
    prune: async () => { calls.push("prune"); return 1 },
  }
}

describe("DurableOutboxPublisher", () => {
  it("publishes a canonical tenant-routed envelope and marks only after ACK", async () => {
    const repo = repository()
    const publish = vi.fn(async () => { repo.calls.push("ack") })
    const publisher = new DurableOutboxPublisher({
      repository: repo,
      transport: { publish },
      sourceApp: "seumei",
      domain: "seumei",
      declaredEvents: ["establishment.selected"],
      now: () => new Date("2026-08-30T12:01:00.000Z"),
    })

    await expect(publisher.runBatch()).resolves.toEqual({ claimed: 1, published: 1, retried: 0, deadLettered: 0 })
    expect(publish).toHaveBeenCalledWith({
      subject: "matriz.v1.seumei.establishment.selected",
      messageId: "outbox-1",
      data: {
        id: "outbox-1", name: "establishment.selected", version: "v1", sourceApp: "seumei",
        tenantId: "tenant-a", occurredAt: "2026-08-30T12:00:00.000Z", payload: { establishmentId: "company-1" },
      },
    })
    expect(repo.calls).toEqual(["claim", "ack", "published:outbox-1"])
  })

  it("keeps the authoritative record pending when both publish and DLQ fail", async () => {
    const repo = repository([{ ...event, attempts: 10 }])
    const publisher = new DurableOutboxPublisher({
      repository: repo, sourceApp: "seumei", domain: "seumei", declaredEvents: [event.eventName], now: () => new Date(),
      transport: { publish: async () => { throw new Error("payload must not escape") }, publishDeadLetter: async () => { throw new Error("offline") } },
    })
    await expect(publisher.runBatch()).resolves.toEqual({ claimed: 1, published: 0, retried: 1, deadLettered: 0 })
    expect(repo.calls).toEqual(["claim", "retry:outbox-1"])
  })

  it("dead-letters undeclared events without publishing their payload", async () => {
    const repo = repository()
    const publish = vi.fn()
    const publisher = new DurableOutboxPublisher({ repository: repo, transport: { publish }, sourceApp: "seumei", domain: "seumei", declaredEvents: [], now: () => new Date() })
    await expect(publisher.runBatch()).resolves.toEqual({ claimed: 1, published: 0, retried: 0, deadLettered: 1 })
    expect(publish).not.toHaveBeenCalled()
    expect(repo.calls).toEqual(["claim", "dead:outbox-1"])
  })
})

describe("ManagedJetStreamTransport", () => {
  it("uses the outbox id for JetStream deduplication and propagates missing ACKs", async () => {
    const publish = vi.fn(async () => ({ stream: "MATRIZ_SEUMEI", seq: 1, duplicate: false }))
    const transport = new ManagedJetStreamTransport(
      { url: "nats://127.0.0.1:54222", username: "matriz_seumei", password: "secret", connectionName: "seumei-outbox" },
      async () => ({ client: { publish }, close: async () => undefined }),
    )
    await transport.publish({ subject: "matriz.v1.seumei.establishment.selected", messageId: "outbox-1", data: { id: "outbox-1" } })
    expect(publish).toHaveBeenCalledWith(expect.any(String), expect.any(Uint8Array), { msgID: "outbox-1", timeout: 5_000 })
  })
})

const inboxEnvelope: InboxEnvelope = {
  id: "outbox-1",
  name: "wallet.created",
  version: "v1",
  sourceApp: "matriz-pay",
  tenantId: null,
  occurredAt: "2026-08-30T12:00:00.000Z",
  payload: { walletId: "wallet-1" },
}

function inboxMessage(data: unknown = inboxEnvelope): InboxMessage & { calls: string[] } {
  const calls: string[] = []
  return {
    subject: "matriz.v1.pay.wallet.created",
    data,
    calls,
    ack: async () => { calls.push("ack") },
    retry: async () => { calls.push("retry") },
    terminate: async () => { calls.push("terminate") },
  }
}

describe("DurableInboxConsumer", () => {
  it("ACKs only after the repository commits the handler effect", async () => {
    const message = inboxMessage()
    const calls: string[] = []
    const repository: InboxRepository<string> = {
      processOnce: async (envelope, handler) => {
        calls.push(`begin:${envelope.id}`)
        await handler("transaction")
        calls.push("commit")
        return "processed"
      },
    }
    const consumer = new DurableInboxConsumer({
      repository,
      declaredEvents: ["wallet.created"],
      handle: async (envelope, transaction) => { calls.push(`handle:${envelope.name}:${transaction}`) },
    })

    await expect(consumer.consume(message)).resolves.toBe("processed")
    expect(calls).toEqual(["begin:outbox-1", "handle:wallet.created:transaction", "commit"])
    expect(message.calls).toEqual(["ack"])
  })

  it("ACKs a duplicate without invoking its domain handler again", async () => {
    const message = inboxMessage()
    const handle = vi.fn()
    const consumer = new DurableInboxConsumer({
      repository: { processOnce: async () => "duplicate" },
      declaredEvents: ["wallet.created"],
      handle,
    })

    await expect(consumer.consume(message)).resolves.toBe("duplicate")
    expect(handle).not.toHaveBeenCalled()
    expect(message.calls).toEqual(["ack"])
  })

  it("requests retry and does not ACK when the database transaction fails", async () => {
    const message = inboxMessage()
    const consumer = new DurableInboxConsumer({
      repository: { processOnce: async () => { throw new Error("private database detail") } },
      declaredEvents: ["wallet.created"],
      handle: async () => undefined,
    })

    await expect(consumer.consume(message)).resolves.toBe("retry")
    expect(message.calls).toEqual(["retry"])
  })

  it("terminates malformed or undeclared messages without exposing them to the handler", async () => {
    const malformed = inboxMessage({ payload: "not-an-envelope" })
    const undeclared = inboxMessage({ ...inboxEnvelope, name: "wallet.unknown" })
    const handle = vi.fn()
    const consumer = new DurableInboxConsumer({
      repository: { processOnce: async () => "processed" },
      declaredEvents: ["wallet.created"],
      handle,
    })

    await expect(consumer.consume(malformed)).resolves.toBe("terminated")
    await expect(consumer.consume(undeclared)).resolves.toBe("terminated")
    expect(handle).not.toHaveBeenCalled()
    expect(malformed.calls).toEqual(["terminate"])
    expect(undeclared.calls).toEqual(["terminate"])
  })
})
