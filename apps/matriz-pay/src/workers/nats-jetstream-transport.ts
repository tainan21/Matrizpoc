import { jetstream, type JetStreamClient } from "@nats-io/jetstream"
import { connect as connectNats, type NatsConnection } from "@nats-io/transport-node"
import type { JetStreamMessage, PayJetStreamTransport } from "./outbox-publisher"

export type PayNatsConfig = Readonly<{
  url: "nats://127.0.0.1:54222"
  username: string
  password: string
}>

type ConnectedTransport = Readonly<{
  client: Pick<JetStreamClient, "publish">
  close(): Promise<void>
}>

type Connector = (config: PayNatsConfig) => Promise<ConnectedTransport>

const MANAGED_NATS_URL = "nats://127.0.0.1:54222" as const

export function parsePayNatsConfig(environment: Readonly<Record<string, string | undefined>>): PayNatsConfig {
  if (environment.NATS_URL !== MANAGED_NATS_URL) throw new Error(`NATS_URL must use the managed loopback endpoint ${MANAGED_NATS_URL}`)
  const username = environment.PAY_NATS_USERNAME?.trim()
  const password = environment.PAY_NATS_PASSWORD
  if (!username || !password) throw new Error("Pay NATS credentials are required")
  return { url: MANAGED_NATS_URL, username, password }
}

export class NatsJetStreamPayTransport implements PayJetStreamTransport {
  private connection?: Promise<ConnectedTransport>

  constructor(private readonly config: PayNatsConfig, private readonly connector: Connector = connectTransport) {}

  publish(message: JetStreamMessage): Promise<void> {
    return this.publishWithAck(message)
  }

  publishDeadLetter(message: JetStreamMessage): Promise<void> {
    return this.publishWithAck(message)
  }

  async close(): Promise<void> {
    if (!this.connection) return
    const connection = await this.connection
    this.connection = undefined
    await connection.close()
  }

  private async publishWithAck(message: JetStreamMessage): Promise<void> {
    const connection = await (this.connection ??= this.connector(this.config))
    await connection.client.publish(message.subject, new TextEncoder().encode(JSON.stringify(message.data)), { msgID: message.messageId, timeout: 5_000 })
  }
}

async function connectTransport(config: PayNatsConfig): Promise<ConnectedTransport> {
  const connection: NatsConnection = await connectNats({ servers: config.url, user: config.username, pass: config.password, name: "matriz-pay-outbox" })
  return {
    client: jetstream(connection),
    close: async () => { await connection.drain() },
  }
}
