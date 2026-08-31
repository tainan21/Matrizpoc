import { describe, expect, it, vi } from "vitest"
import { NatsJetStreamPayTransport, parsePayNatsConfig } from "./nats-jetstream-transport"

describe("parsePayNatsConfig", () => {
  it("accepts only the managed loopback NATS origin and requires credentials", () => {
    expect(parsePayNatsConfig({ NATS_URL: "nats://127.0.0.1:54222", PAY_NATS_USERNAME: "matriz_pay", PAY_NATS_PASSWORD: "secret-value" })).toEqual({
      url: "nats://127.0.0.1:54222",
      username: "matriz_pay",
      password: "secret-value",
    })
    expect(() => parsePayNatsConfig({ NATS_URL: "nats://localhost:54222", PAY_NATS_USERNAME: "matriz_pay", PAY_NATS_PASSWORD: "secret-value" })).toThrow(/managed loopback/i)
    expect(() => parsePayNatsConfig({ NATS_URL: "nats://127.0.0.1:54222", PAY_NATS_USERNAME: "", PAY_NATS_PASSWORD: "" })).toThrow(/credentials/i)
  })
})

describe("NatsJetStreamPayTransport", () => {
  it("uses the outbox id as the JetStream deduplication id and waits for the ACK", async () => {
    const publish = vi.fn(async () => ({ stream: "MATRIZ_PAY", seq: 9, duplicate: false }))
    const close = vi.fn(async () => undefined)
    const connect = vi.fn(async () => ({ client: { publish }, close }))
    const transport = new NatsJetStreamPayTransport({ url: "nats://127.0.0.1:54222", username: "matriz_pay", password: "secret-value" }, connect)

    await transport.publish({ subject: "matriz.v1.pay.wallet.created", messageId: "outbox-1", data: { id: "outbox-1" } })

    expect(connect).toHaveBeenCalledTimes(1)
    expect(publish).toHaveBeenCalledWith(
      "matriz.v1.pay.wallet.created",
      new TextEncoder().encode('{"id":"outbox-1"}'),
      { msgID: "outbox-1", timeout: 5_000 },
    )
    await transport.close()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it("does not hide a missing JetStream ACK", async () => {
    const transport = new NatsJetStreamPayTransport(
      { url: "nats://127.0.0.1:54222", username: "matriz_pay", password: "secret-value" },
      async () => ({ client: { publish: vi.fn(async () => { throw new Error("no responders") }) }, close: vi.fn() }),
    )
    await expect(transport.publish({ subject: "matriz.v1.pay.wallet.created", messageId: "outbox-1", data: {} })).rejects.toThrow("no responders")
  })
})
