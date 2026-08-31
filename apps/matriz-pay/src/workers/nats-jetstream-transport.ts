import { ManagedJetStreamTransport, type JetStreamConnector } from "@matriz/integration-event-delivery"

export type PayNatsConfig = Readonly<{
  url: "nats://127.0.0.1:54222"
  username: string
  password: string
}>

const MANAGED_NATS_URL = "nats://127.0.0.1:54222" as const

export function parsePayNatsConfig(environment: Readonly<Record<string, string | undefined>>): PayNatsConfig {
  if (environment.NATS_URL !== MANAGED_NATS_URL) throw new Error(`NATS_URL must use the managed loopback endpoint ${MANAGED_NATS_URL}`)
  const username = environment.PAY_NATS_USERNAME?.trim()
  const password = environment.PAY_NATS_PASSWORD
  if (!username || !password) throw new Error("Pay NATS credentials are required")
  return { url: MANAGED_NATS_URL, username, password }
}

export class NatsJetStreamPayTransport extends ManagedJetStreamTransport {
  constructor(config: PayNatsConfig, connector?: JetStreamConnector) {
    super({ ...config, connectionName: "matriz-pay-outbox" }, connector)
  }
}
