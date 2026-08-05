import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { DeliveryReceiptStore } from "./delivery-receipt-store"

const roots: string[] = []

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "matriz-delivery-"))
  roots.push(root)
  await mkdir(path.join(root, "apps", "sample", ".matriz"), { recursive: true })
  return { root, store: new DeliveryReceiptStore(root) }
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe("DeliveryReceiptStore", () => {
  it("records an atomic GitHub issue receipt inside .matriz", async () => {
    const { store } = await fixture()
    const taskId = "tsk_11111111-1111-4111-8111-111111111111"
    const receipt = await store.record({
      projectId: "sample",
      taskId,
      idempotencyKey: `sample:${taskId}:revision`,
      url: "https://github.com/matriz/sample/issues/42?utm_source=test#fragment",
    })

    expect(receipt.externalId).toBe("42")
    expect(receipt.url).toBe("https://github.com/matriz/sample/issues/42")
    await expect(store.read("sample", taskId)).resolves.toEqual(receipt)
  })

  it("rejects non-issue hosts, paths and stale revisions", async () => {
    const { store } = await fixture()
    const taskId = "tsk_22222222-2222-4222-8222-222222222222"
    await expect(store.record({
      projectId: "sample",
      taskId,
      idempotencyKey: "sample:key",
      url: "https://example.com/matriz/sample/issues/1",
    })).rejects.toMatchObject({ code: "INVALID_DATA" })

    const receipt = await store.record({
      projectId: "sample",
      taskId,
      idempotencyKey: "sample:key",
      url: "https://github.com/matriz/sample/issues/1",
    })
    await expect(store.record({
      projectId: "sample",
      taskId,
      idempotencyKey: "sample:key",
      url: "https://github.com/matriz/sample/issues/2",
      expectedRevision: `${receipt.revision}-stale`,
    })).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("reports corrupted receipt state as recoverable domain data", async () => {
    const { root, store } = await fixture()
    const taskId = "tsk_33333333-3333-4333-8333-333333333333"
    const receipts = path.join(root, "apps", "sample", ".matriz", "integrations", "github", "issues")
    await mkdir(receipts, { recursive: true })
    await writeFile(path.join(receipts, `${taskId}.json`), "{}")

    await expect(store.read("sample", taskId)).rejects.toMatchObject({
      code: "INVALID_DATA",
    })
  })
})
