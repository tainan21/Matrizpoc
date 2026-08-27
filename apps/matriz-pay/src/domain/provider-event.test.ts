import { describe, expect, it, vi } from "vitest"
import { processProviderEvent } from "./provider-event"

describe("Celcoin provider inbox processor", () => {
  it("confirma exatamente uma vez um Pix de saída", async () => {
    const postConfirmed = vi.fn(async () => "tx-1")
    const markProcessed = vi.fn(async () => undefined)
    const event = { id: "evt-db-1", providerEventId: "evt-1", eventType: "PIX_OUT_CONFIRMED", payload: { providerReference: "pix-1", amountMinor: "1250" } }
    expect(await processProviderEvent(event, { postConfirmed, markProcessed })).toBe("tx-1")
    expect(postConfirmed).toHaveBeenCalledTimes(1)
    expect(markProcessed).toHaveBeenCalledWith("evt-db-1", "tx-1")
  })

  it("não lança novamente um evento já processado", async () => {
    const postConfirmed = vi.fn()
    expect(await processProviderEvent({ id: "evt-db-1", providerEventId: "evt-1", eventType: "PIX_OUT_CONFIRMED", payload: {}, processedTransactionId: "tx-1" }, { postConfirmed, markProcessed: vi.fn() })).toBe("tx-1")
    expect(postConfirmed).not.toHaveBeenCalled()
  })

  it("agenda retry e depois dead-letter sem perder o evento", async () => {
    const markRetry = vi.fn(async () => undefined)
    const markDeadLetter = vi.fn(async () => undefined)
    const dependencies = { postConfirmed: vi.fn(async () => { throw new Error("provider mapping failed") }), markProcessed: vi.fn(), markRetry, markDeadLetter }
    await expect(processProviderEvent({ id: "evt-db-1", providerEventId: "evt-1", eventType: "PIX_IN_CONFIRMED", payload: {}, attempts: 2 }, dependencies)).rejects.toThrow("provider mapping failed")
    expect(markRetry).toHaveBeenCalledTimes(1)
    await expect(processProviderEvent({ id: "evt-db-1", providerEventId: "evt-1", eventType: "PIX_IN_CONFIRMED", payload: {}, attempts: 7 }, dependencies)).rejects.toThrow("provider mapping failed")
    expect(markDeadLetter).toHaveBeenCalledTimes(1)
  })
})
