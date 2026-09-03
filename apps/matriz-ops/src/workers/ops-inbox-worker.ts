import { DurableInboxConsumer, type InboxMessage } from "@matriz/integration-event-delivery"
import { jetstream, type Consumer, type JsMsg } from "@nats-io/jetstream"
import { connect, type NatsConnection } from "@nats-io/transport-node"
import { manifest } from "../manifest/manifest"
import { projectPayEvent } from "./pay-event-handler"
import { PrismaOpsInboxRepository } from "./prisma-inbox-repository"

const MANAGED_URL = "nats://127.0.0.1:54222" as const

export type OpsInboxRuntime = Readonly<{ stop(): Promise<void> }>

export async function startOpsInboxWorker(environment: Readonly<Record<string, string | undefined>> = process.env): Promise<OpsInboxRuntime> {
  if (environment.MATRIZ_RUNTIME_PROFILE !== "local" || environment.OPS_INBOX_WORKER_ENABLED !== "true") throw new Error("Ops inbox worker is not enabled")
  if (environment.NATS_URL !== MANAGED_URL || !environment.OPS_NATS_USERNAME || !environment.OPS_NATS_PASSWORD) throw new Error("Managed Ops NATS credentials are required")
  const connection = await connect({ servers: MANAGED_URL, user: environment.OPS_NATS_USERNAME, pass: environment.OPS_NATS_PASSWORD, name: "matriz-ops-inbox" })
  const consumer = await jetstream(connection).consumers.get("MATRIZ_PAY", "MATRIZ_OPS_PAY")
  const inbox = new DurableInboxConsumer({ repository: new PrismaOpsInboxRepository(), declaredEvents: manifest.eventsConsumed, handle: projectPayEvent })
  let stopped = false
  const run = consumeLoop(consumer, inbox, () => stopped)
  return { stop: async () => { stopped = true; await connection.drain(); await run } }
}

async function consumeLoop(consumer: Consumer, inbox: DurableInboxConsumer, stopped: () => boolean): Promise<void> {
  while (!stopped()) {
    const message = await consumer.next({ expires: 1_000 }).catch(() => null)
    if (message) await inbox.consume(adaptMessage(message))
  }
}

function adaptMessage(message: JsMsg): InboxMessage {
  let data: unknown
  try { data = message.json() } catch { data = null }
  return {
    subject: message.subject,
    data,
    ack: async () => { message.ack() },
    retry: async () => { message.nak(1_000) },
    terminate: async () => { message.term("invalid_or_undeclared_event") },
  }
}
