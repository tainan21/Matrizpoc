import { DurableOutboxPublisher } from "@matriz/integration-event-delivery"
import { manifest } from "../manifest/manifest"
import { createSeumeiNatsTransport } from "./nats-transport"
import { PrismaSeumeiOutboxRepository } from "./prisma-outbox-repository"

export function startLocalSeumeiOutboxWorker(environment: Readonly<Record<string, string | undefined>> = process.env) {
  if (environment.MATRIZ_RUNTIME_PROFILE !== "local" || environment.SEUMEI_OUTBOX_WORKER_ENABLED !== "true") throw new Error("Seumei outbox worker is not enabled")
  const transport = createSeumeiNatsTransport(environment)
  const publisher = new DurableOutboxPublisher({ repository: new PrismaSeumeiOutboxRepository(), transport, sourceApp: manifest.appId, domain: "seumei", declaredEvents: manifest.eventsProduced, now: () => new Date() })
  const run = async () => { try { console.info(JSON.stringify({ component: "seumei-outbox-worker", ...await publisher.runBatch() })) } catch { console.error(JSON.stringify({ component: "seumei-outbox-worker", code: "batch_failed" })) } }
  const batch = setInterval(() => { void run() }, 1_000)
  const prune = setInterval(() => { void publisher.prune() }, 60 * 60_000)
  batch.unref(); prune.unref(); void run()
  return { stop: async () => { clearInterval(batch); clearInterval(prune); await transport.close() } }
}
