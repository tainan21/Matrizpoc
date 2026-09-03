import type { InboxEnvelope, InboxRepository } from "@matriz/integration-event-delivery"
import { getOpsWorkerDb } from "@matriz/platform-db/ops"

type Client = ReturnType<typeof getOpsWorkerDb>
type Transaction = Parameters<Parameters<Client["$transaction"]>[0]>[0]

export class PrismaOpsInboxRepository implements InboxRepository<Transaction> {
  constructor(private readonly client: Client = getOpsWorkerDb()) {}

  async processOnce(envelope: InboxEnvelope, handler: (transaction: Transaction) => Promise<void>): Promise<"processed" | "duplicate"> {
    return this.client.$transaction(async (transaction) => {
      const inserted = await transaction.opsInboxEvent.createMany({
        data: [{
          sourceEventId: envelope.id,
          eventName: envelope.name,
          eventVersion: envelope.version,
          sourceApp: envelope.sourceApp,
          occurredAt: new Date(envelope.occurredAt),
        }],
        skipDuplicates: true,
      })
      if (inserted.count === 0) return "duplicate"
      await handler(transaction)
      return "processed"
    })
  }
}
