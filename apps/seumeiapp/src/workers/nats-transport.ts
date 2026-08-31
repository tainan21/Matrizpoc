import { ManagedJetStreamTransport } from "@matriz/integration-event-delivery"

const URL = "nats://127.0.0.1:54222" as const

export function createSeumeiNatsTransport(environment: Readonly<Record<string, string | undefined>>): ManagedJetStreamTransport {
  if (environment.NATS_URL !== URL) throw new Error("Seumei NATS must use the managed loopback endpoint")
  const username = environment.SEUMEI_NATS_USERNAME?.trim()
  const password = environment.SEUMEI_NATS_PASSWORD
  if (!username || !password) throw new Error("Seumei NATS credentials are required")
  return new ManagedJetStreamTransport({ url: URL, username, password, connectionName: "seumei-outbox" })
}
