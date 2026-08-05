import { mkdir, mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import type {
  NotificationDeliveryReceipt,
  NotificationOutboxItem,
  NotificationProvider,
} from "../../domain/notification"
import { NotificationOutboxStore } from "../../integration/collaboration/notification-outbox-store"
import { NotificationDispatcher } from "./notification-dispatcher"

const roots: string[] = []

async function fixture(provider?: NotificationProvider) {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-dispatcher-"))
  roots.push(root)
  await mkdir(path.join(root, "apps", "sample", ".matriz"), { recursive: true })
  const store = new NotificationOutboxStore(root)
  const initial = await store.getConfig("sample")
  await store.updateConfig("sample", {
    enabled: true,
    channels: ["slack"],
    events: ["completed"],
    redaction: {
      includeSummary: true,
      includeFilePaths: false,
      includeExternalUrls: false,
    },
  }, initial.revision)
  const [item] = await store.enqueue("sample", {
    event: "completed",
    idempotencyKey: "request:completed:one",
    title: "Completed",
    body: "Work completed",
    workbenchPath: "/projects/sample/agents",
  })
  return {
    item,
    store,
    dispatcher: new NotificationDispatcher(store, provider ? [provider] : []),
  }
}

function fakeProvider(
  deliver: (item: NotificationOutboxItem) => Promise<NotificationDeliveryReceipt>,
): NotificationProvider {
  return { channel: "slack", deliver }
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("NotificationDispatcher", () => {
  it("claims and records a valid provider receipt exactly once", async () => {
    const deliver = vi.fn(async () => ({
      providerMessageId: "msg-1",
      providerUrl: "https://slack.com/archives/channel/p123",
    }))
    const { dispatcher } = await fixture(fakeProvider(deliver))
    const now = new Date("2026-07-29T12:00:00.000Z")

    const first = await dispatcher.deliverNext("sample", now)
    expect(first).toMatchObject({
      status: "delivered",
      item: {
        status: "delivered",
        attempts: 1,
        providerMessageId: "msg-1",
        deliveredAt: now.toISOString(),
      },
    })
    await expect(dispatcher.deliverNext("sample", now)).resolves.toEqual({ status: "idle" })
    expect(deliver).toHaveBeenCalledTimes(1)
  })

  it("preserves local state and sanitizes provider failures", async () => {
    const { dispatcher } = await fixture(fakeProvider(async () => {
      throw new Error("token=super-secret C:\\Users\\alice\\provider.log")
    }))
    const now = new Date("2026-07-29T12:00:00.000Z")

    const result = await dispatcher.deliverNext("sample", now)
    expect(result).toMatchObject({
      status: "failed",
      item: {
        status: "failed",
        attempts: 1,
        nextAttemptAt: "2026-07-29T12:00:30.000Z",
      },
    })
    if (result.status !== "failed") throw new Error("Expected failed dispatch")
    expect(result.item.lastError).toContain("token=[redacted]")
    expect(result.item.lastError).toContain("%USERPROFILE%")
    expect(result.item.lastError).not.toContain("super-secret")
    expect(result.item.lastError).not.toContain("alice")
  })

  it("retries a failed item without inflating attempt counts", async () => {
    const deliver = vi.fn()
      .mockRejectedValueOnce(new Error("temporary outage"))
      .mockResolvedValueOnce({ providerMessageId: "msg-2" })
    const { dispatcher, store } = await fixture(fakeProvider(deliver))
    const failedResult = await dispatcher.deliverNext(
      "sample",
      new Date("2026-07-29T12:00:00.000Z"),
    )
    if (failedResult.status !== "failed") throw new Error("Expected failed dispatch")

    const retried = await store.updateStatus(
      "sample",
      failedResult.item.id,
      "retry",
      failedResult.item.revision,
    )
    expect(retried.attempts).toBe(1)
    expect(retried.nextAttemptAt).toBeUndefined()

    const delivered = await dispatcher.deliverNext(
      "sample",
      new Date("2026-07-29T12:01:00.000Z"),
    )
    expect(delivered).toMatchObject({
      status: "delivered",
      item: { attempts: 2, providerMessageId: "msg-2" },
    })
    expect(deliver).toHaveBeenCalledTimes(2)
  })

  it("does not claim work when its provider is unavailable", async () => {
    const { dispatcher, item, store } = await fixture()

    await expect(dispatcher.deliverNext("sample")).resolves.toEqual({
      status: "provider_unavailable",
      channel: "slack",
    })
    const [persisted] = await store.list("sample")
    expect(persisted).toMatchObject({
      id: item.id,
      status: "queued",
      attempts: 0,
      revision: item.revision,
    })
  })

  it("turns unsafe provider receipts into an auditable failed attempt", async () => {
    const { dispatcher } = await fixture(fakeProvider(async () => ({
      providerUrl: "http://user:password@example.com/message",
    })))

    const result = await dispatcher.deliverNext("sample")
    expect(result.status).toBe("failed")
    if (result.status !== "failed") throw new Error("Expected failed dispatch")
    expect(result.item.lastError).toBeTruthy()
    expect(result.item.providerUrl).toBeUndefined()
  })
})
