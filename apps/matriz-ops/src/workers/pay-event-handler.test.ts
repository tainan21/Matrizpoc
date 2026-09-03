import { describe, expect, it, vi } from "vitest"
import { projectPayEvent } from "./pay-event-handler"

describe("projectPayEvent", () => {
  it("stores a read-only operational projection without reproducing ledger values", async () => {
    const create = vi.fn(async () => ({}))
    await projectPayEvent({
      id: "event-1",
      name: "wallet.entry.posted",
      version: "v1",
      sourceApp: "matriz-pay",
      tenantId: null,
      occurredAt: "2026-09-03T12:00:00.000Z",
      payload: { walletId: "wallet-1", transactionId: "transaction-1", amountMinor: 5_000, secret: "ignored" },
    }, { opsPayEventProjection: { create } } as never)

    expect(create).toHaveBeenCalledWith({ data: {
      sourceEventId: "event-1",
      eventName: "wallet.entry.posted",
      walletId: "wallet-1",
      transactionId: "transaction-1",
      occurredAt: new Date("2026-09-03T12:00:00.000Z"),
    } })
  })

  it("rejects a forged event authority", async () => {
    await expect(projectPayEvent({
      id: "event-2", name: "wallet.created", version: "v1", sourceApp: "other-app",
      tenantId: null, occurredAt: "2026-09-03T12:00:00.000Z", payload: {},
    }, {} as never)).rejects.toThrow("Unsupported Pay event authority")
  })
})
