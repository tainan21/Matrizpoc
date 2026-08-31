import { DurableOutboxPublisher, ManagedJetStreamTransport } from "@matriz/integration-event-delivery"
import { manifest } from "../../../manifest/manifest"
import { PrismaHubOutboxRepository } from "./prisma-outbox-repository"

const URL = "nats://127.0.0.1:54222" as const
export function startLocalHubOutboxWorker(environment: Readonly<Record<string, string | undefined>> = process.env) {
  if (environment.MATRIZ_RUNTIME_PROFILE !== "local" || environment.HUB_OUTBOX_WORKER_ENABLED !== "true") throw new Error("Hub outbox worker is not enabled")
  if (environment.NATS_URL !== URL || !environment.HUB_NATS_USERNAME?.trim() || !environment.HUB_NATS_PASSWORD) throw new Error("Hub managed NATS credentials are required")
  const transport = new ManagedJetStreamTransport({ url: URL, username: environment.HUB_NATS_USERNAME, password: environment.HUB_NATS_PASSWORD, connectionName: "hub-outbox" })
  const publisher = new DurableOutboxPublisher({ repository: new PrismaHubOutboxRepository(), transport, sourceApp: manifest.appId, domain: "hub", declaredEvents: manifest.eventsProduced, now: () => new Date() })
  const run = async () => { try { console.info(JSON.stringify({ component: "hub-outbox-worker", ...await publisher.runBatch() })) } catch { console.error(JSON.stringify({ component: "hub-outbox-worker", code: "batch_failed" })) } }
  const batch = setInterval(() => { void run() }, 1_000); const prune = setInterval(() => { void publisher.prune() }, 60 * 60_000)
  batch.unref(); prune.unref(); void run()
  return { stop: async () => { clearInterval(batch); clearInterval(prune); await transport.close() } }
}
