import { describe, expect, it, vi } from "vitest"
import { PayOutboxWorker } from "./pay-outbox-worker"

describe("PayOutboxWorker", () => {
  it("never overlaps batches and reports aggregate counters without payloads", async () => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => { release = resolve })
    const runBatch = vi.fn(async () => { await pending; return { claimed: 1, published: 1, retried: 0, deadLettered: 0 } })
    const report = vi.fn()
    const worker = new PayOutboxWorker({ publisher: { runBatch, prune: vi.fn(async () => 0) }, report })

    const first = worker.tick()
    await worker.tick()
    expect(runBatch).toHaveBeenCalledTimes(1)
    release()
    await first
    expect(report).toHaveBeenCalledWith({ type: "batch", claimed: 1, published: 1, retried: 0, deadLettered: 0 })
  })

  it("sanitizes failures and continues on the next tick", async () => {
    const runBatch = vi.fn()
      .mockRejectedValueOnce(new Error("nats://user:secret@127.0.0.1 payload"))
      .mockResolvedValueOnce({ claimed: 0, published: 0, retried: 0, deadLettered: 0 })
    const report = vi.fn()
    const worker = new PayOutboxWorker({ publisher: { runBatch, prune: vi.fn(async () => 0) }, report })

    await worker.tick()
    await worker.tick()

    expect(runBatch).toHaveBeenCalledTimes(2)
    expect(report).toHaveBeenNthCalledWith(1, { type: "error", code: "pay_outbox_batch_failed" })
  })
})
