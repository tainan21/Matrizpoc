import { connect } from "@nats-io/transport-node"
import { jetstreamManager } from "@nats-io/jetstream"
import { describe, expect, it } from "vitest"
import { NatsJetStreamPayTransport, parsePayNatsConfig } from "./nats-jetstream-transport"

const integration = describe.runIf(process.env.RUN_NATS_INTEGRATION === "1")

integration("Pay JetStream transport on real NATS", () => {
  it("receives a storage ACK and tolerates replay of the same outbox id", async () => {
    const config = parsePayNatsConfig(process.env)
    const connection = await connect({ servers: config.url, user: "matriz_control", pass: process.env.NATS_CONTROL_PASSWORD })
    const manager = await jetstreamManager(connection)
    await manager.streams.add({ name: "MATRIZ_PAY_TEST", subjects: ["matriz.v1.pay.>"], duplicate_window: 120_000_000_000 })
    const transport = new NatsJetStreamPayTransport(config)
    try {
      const message = { subject: "matriz.v1.pay.wallet.created", messageId: `outbox-${Date.now()}`, data: { contractVersion: "v1" } }
      await expect(transport.publish(message)).resolves.toBeUndefined()
      await expect(transport.publish(message)).resolves.toBeUndefined()
      expect((await manager.streams.info("MATRIZ_PAY_TEST")).state.messages).toBe(1)
      await expect(transport.publish({ ...message, subject: "matriz.v1.core.identity.changed", messageId: `${message.messageId}-forbidden` })).rejects.toThrow()
    }
    finally {
      await transport.close()
      await manager.streams.delete("MATRIZ_PAY_TEST")
      await connection.drain()
    }
  })
})
