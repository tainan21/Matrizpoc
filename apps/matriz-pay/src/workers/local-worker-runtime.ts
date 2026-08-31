import { NatsJetStreamPayTransport, parsePayNatsConfig } from "./nats-jetstream-transport"
import { PayOutboxPublisher } from "./outbox-publisher"
import { PayOutboxWorker } from "./pay-outbox-worker"
import { PrismaPayOutboxRepository } from "./prisma-outbox-repository"

type Runtime = Readonly<{ stop(): Promise<void> }>

export function startLocalPayOutboxWorker(environment: Readonly<Record<string, string | undefined>> = process.env): Runtime {
  if (environment.MATRIZ_RUNTIME_PROFILE !== "local" || environment.PAY_OUTBOX_WORKER_ENABLED !== "true") throw new Error("Pay outbox worker is not enabled for this runtime")
  const transport = new NatsJetStreamPayTransport(parsePayNatsConfig(environment))
  const publisher = new PayOutboxPublisher({ repository: new PrismaPayOutboxRepository(), transport, now: () => new Date() })
  const worker = new PayOutboxWorker({ publisher, report: (event) => console.info(JSON.stringify({ component: "pay-outbox-worker", ...event })) })
  const batchTimer = setInterval(() => { void worker.tick() }, 1_000)
  const pruneTimer = setInterval(() => { void worker.prune() }, 60 * 60_000)
  batchTimer.unref()
  pruneTimer.unref()
  void worker.tick()
  return {
    stop: async () => {
      clearInterval(batchTimer)
      clearInterval(pruneTimer)
      await transport.close()
    },
  }
}
