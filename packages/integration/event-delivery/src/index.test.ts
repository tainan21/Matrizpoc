import { describe, expect, it, vi } from "vitest"
import {
  DurableOutboxPublisher,
  ManagedJetStreamTransport,
  type ClaimedOutboxEvent,
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
