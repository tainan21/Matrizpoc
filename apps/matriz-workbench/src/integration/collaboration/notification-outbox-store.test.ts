import { mkdir, mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { NotificationOutboxStore } from "./notification-outbox-store"

const roots: string[] = []
const taskId = "tsk_11111111-1111-4111-8111-111111111111"
const requestId = "req_22222222-2222-4222-8222-222222222222"

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-notification-"))
  roots.push(root)
  await mkdir(path.join(root, "apps", "sample", ".matriz"), { recursive: true })
  return new NotificationOutboxStore(root)
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("NotificationOutboxStore", () => {
  it("is disabled by default and does not create records", async () => {
    const store = await fixture()
    const config = await store.getConfig("sample")
    expect(config.enabled).toBe(false)

    await expect(store.enqueue("sample", {
      event: "blocked",
      idempotencyKey: "request:blocked:1",
      title: "Blocked",
      workbenchPath: "/projects/sample/agents",
    })).resolves.toEqual([])
    await expect(store.list("sample")).resolves.toEqual([])
  })

  it("creates one idempotent item per enabled channel and applies redaction", async () => {
    const store = await fixture()
    const initial = await store.getConfig("sample")
    await store.updateConfig("sample", {
      enabled: true,
      channels: ["slack", "teams"],
      events: ["review_ready"],
      redaction: {
        includeSummary: false,
        includeFilePaths: false,
        includeExternalUrls: false,
      },
    }, initial.revision)

    const input = {
      event: "review_ready" as const,
      idempotencyKey: "request:review:abc",
      title: "Ready",
      body: "Sensitive summary",
      workbenchPath: `/projects/sample/agents/${requestId}`,
      backlogItemId: taskId,
      agentRequestId: requestId,
    }
    const first = await store.enqueue("sample", input)
    const second = await store.enqueue("sample", input)

    expect(first).toHaveLength(2)
    expect(first.map((item) => item.channel).sort()).toEqual(["slack", "teams"])
    expect(first.every((item) => item.body === "")).toBe(true)
    expect(second.map((item) => item.id).sort()).toEqual(first.map((item) => item.id).sort())
    await expect(store.list("sample")).resolves.toHaveLength(2)
  })

  it("rejects stale updates and unsafe project paths", async () => {
    const store = await fixture()
    const initial = await store.getConfig("sample")
    const config = await store.updateConfig("sample", {
      enabled: true,
      channels: ["slack"],
      events: ["blocked"],
      redaction: {
        includeSummary: true,
        includeFilePaths: false,
        includeExternalUrls: false,
      },
    }, initial.revision)

    await expect(store.updateConfig("sample", {
      enabled: false,
      channels: [],
      events: [],
      redaction: config.redaction,
    }, initial.revision)).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(store.getConfig("../sample")).rejects.toMatchObject({ code: "INVALID_PATH" })
  })

  it("counts actual delivery attempts, applies backoff and supports retry", async () => {
    const store = await fixture()
    const initial = await store.getConfig("sample")
    await store.updateConfig("sample", {
      enabled: true,
      channels: ["slack"],
      events: ["blocked"],
      redaction: {
        includeSummary: true,
        includeFilePaths: false,
        includeExternalUrls: false,
      },
    }, initial.revision)
    const [created] = await store.enqueue("sample", {
      event: "blocked",
      idempotencyKey: "request:blocked:2",
      title: "Blocked",
      body: "Falha em apps/sample/src/a.ts; veja https://example.com/log",
      workbenchPath: "/projects/sample/agents",
    })
    expect(created.body).toContain("[path omitted]")
    expect(created.body).toContain("[url omitted]")
    expect(created.body).not.toContain("apps/sample")
    expect(created.body).not.toContain("https://")
    const claimed = await store.claimForDelivery(
      "sample",
      created.id,
      created.revision,
      new Date("2026-07-29T12:00:00.000Z"),
    )
    expect(claimed.status).toBe("delivering")
    expect(claimed.attempts).toBe(1)
    const failed = await store.recordDeliveryFailure(
      "sample",
      claimed.id,
      claimed.revision,
      new Error("temporary"),
      new Date("2026-07-29T12:00:00.000Z"),
    )
    expect(failed.nextAttemptAt).toBe("2026-07-29T12:00:30.000Z")
    const retried = await store.updateStatus("sample", failed.id, "retry", failed.revision)
    expect(retried.attempts).toBe(1)
    expect(retried.nextAttemptAt).toBeUndefined()
    const canceled = await store.updateStatus("sample", retried.id, "cancel", retried.revision)
    expect(canceled.status).toBe("canceled")
  })

  it("rejects stale delivery transitions and unsafe receipt URLs", async () => {
    const store = await fixture()
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
    const [created] = await store.enqueue("sample", {
      event: "completed",
      idempotencyKey: "request:completed:3",
      title: "Completed",
      workbenchPath: "/projects/sample/agents",
    })
    const claimed = await store.claimForDelivery("sample", created.id, created.revision)

    await expect(store.claimForDelivery(
      "sample",
      created.id,
      created.revision,
    )).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(store.recordDeliverySuccess(
      "sample",
      claimed.id,
      claimed.revision,
      { providerUrl: "http://example.com/message" },
    )).rejects.toBeTruthy()
  })

  it("recovers an abandoned delivery claim without counting another attempt", async () => {
    const store = await fixture()
    const initial = await store.getConfig("sample")
    await store.updateConfig("sample", {
      enabled: true,
      channels: ["teams"],
      events: ["blocked"],
      redaction: {
        includeSummary: true,
        includeFilePaths: false,
        includeExternalUrls: false,
      },
    }, initial.revision)
    const [created] = await store.enqueue("sample", {
      event: "blocked",
      idempotencyKey: "request:blocked:abandoned",
      title: "Blocked",
      workbenchPath: "/projects/sample/agents",
    })
    await store.claimForDelivery(
      "sample",
      created.id,
      created.revision,
      new Date("2026-07-29T12:00:00.000Z"),
    )

    await expect(store.recoverStaleDeliveries(
      "sample",
      new Date("2026-07-29T12:03:00.000Z"),
    )).resolves.toBe(1)
    const [recovered] = await store.list("sample")
    expect(recovered).toMatchObject({
      status: "failed",
      attempts: 1,
      nextAttemptAt: "2026-07-29T12:03:00.000Z",
      lastError: "Entrega interrompida antes do recibo do provedor.",
    })
  })
})
