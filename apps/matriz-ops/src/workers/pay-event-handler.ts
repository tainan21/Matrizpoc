import type { InboxEnvelope } from "@matriz/integration-event-delivery"
import type { OpsPrismaClient } from "@matriz/platform-db/ops"

type Transaction = Parameters<Parameters<OpsPrismaClient["$transaction"]>[0]>[0]

export async function projectPayEvent(envelope: InboxEnvelope, transaction: Transaction): Promise<void> {
  if (envelope.sourceApp !== "matriz-pay" || envelope.version !== "v1") throw new Error("Unsupported Pay event authority")
  await transaction.opsPayEventProjection.create({ data: {
    sourceEventId: envelope.id,
    eventName: envelope.name,
    walletId: optionalId(envelope.payload.walletId),
    transactionId: optionalId(envelope.payload.transactionId),
    occurredAt: new Date(envelope.occurredAt),
  } })
}

function optionalId(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string" || !value.trim() || value.length > 200) throw new Error("Invalid Pay event identifier")
  return value
}
