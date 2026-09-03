import { afterAll, describe, expect, it } from "vitest"
import { getPayDb, getPayWorkerDb } from "@matriz/platform-db/pay"
import { ensureWallet } from "../server/wallet-service"
import { NatsJetStreamPayTransport, parsePayNatsConfig } from "./nats-jetstream-transport"
import { PayOutboxPublisher } from "./outbox-publisher"
import { PayOutboxWorker } from "./pay-outbox-worker"
import { PrismaPayOutboxRepository } from "./prisma-outbox-repository"

const integration = describe.runIf(process.env.RUN_PAY_DELIVERY_INTEGRATION === "1")

integration("Pay durable delivery on real portable infrastructure", () => {
  afterAll(async () => {
    await Promise.all([getPayDb().$disconnect(), getPayWorkerDb().$disconnect()])
  })

  it("publishes a committed wallet outbox row to JetStream before acknowledging it", async () => {
    const userId = `delivery-${crypto.randomUUID()}`
    const wallet = await ensureWallet(userId)
    const row = await getPayDb().payOutboxEvent.findUniqueOrThrow({
      where: { deduplicationKey: `wallet.created:${wallet.id}` },
    })
    const transport = new NatsJetStreamPayTransport(parsePayNatsConfig(process.env))
    const publisher = new PayOutboxPublisher({
      repository: new PrismaPayOutboxRepository(),
      transport,
      now: () => new Date(),
      batchSize: 1,
    })
    const reports: unknown[] = []
    const worker = new PayOutboxWorker({ publisher, report: (event) => reports.push(event) })

    try {
      await worker.tick()
      expect(reports).toContainEqual({
        type: "batch",
        claimed: 1,
        published: 1,
        retried: 0,
        deadLettered: 0,
      })
      await expect(getPayDb().payOutboxEvent.findUniqueOrThrow({ where: { id: row.id } })).resolves.toMatchObject({
        publishedAt: expect.any(Date),
        attempts: 1,
        lastErrorCode: null,
      })
    } finally {
      await transport.close()
    }
  })
})
