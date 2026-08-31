import { getPayDb } from "@matriz/platform-db/pay"
import type { ClaimedOutboxEvent, PayOutboxRepository } from "./outbox-publisher"

type OutboxRow = Readonly<{
  id: string
  eventName: string
  eventVersion: string
  payloadJson: unknown
  occurredAt: Date
  attempts: number
}>

type Client = ReturnType<typeof getPayDb>

export class PrismaPayOutboxRepository implements PayOutboxRepository {
  constructor(private readonly client: Client = getPayDb()) {}

  async claim(input: { limit: number; lockUntil: Date; now: Date }): Promise<readonly ClaimedOutboxEvent[]> {
    const limit = Math.max(1, Math.min(100, Math.trunc(input.limit)))
    const rows = await this.client.$queryRawUnsafe<OutboxRow[]>(`
      WITH candidate AS (
        SELECT id, attempts
        FROM pay.outbox_events
        WHERE "publishedAt" IS NULL
          AND "deadLetteredAt" IS NULL
          AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= $2)
          AND ("lockedUntil" IS NULL OR "lockedUntil" < $2)
        ORDER BY "occurredAt", id
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE pay.outbox_events AS event
      SET "lockedUntil" = $3, attempts = candidate.attempts + 1
      FROM candidate
      WHERE event.id = candidate.id
      RETURNING event.id, event."eventName", event."eventVersion", event."payloadJson", event."occurredAt", event.attempts
    `, limit, input.now, input.lockUntil)
    return rows.map((row) => ({ id: row.id, eventName: row.eventName, eventVersion: row.eventVersion, tenantId: null, payload: asPayload(row.payloadJson), occurredAt: row.occurredAt, attempts: row.attempts }))
  }

  async markPublished(id: string, publishedAt: Date): Promise<void> {
    const result = await this.client.payOutboxEvent.updateMany({ where: { id, publishedAt: null, deadLetteredAt: null, lockedUntil: { not: null } }, data: { publishedAt, lockedUntil: null, nextAttemptAt: null, lastErrorCode: null } })
    assertClaim(result.count)
  }

  async releaseForRetry(id: string, input: { nextAttemptAt: Date; errorCode: string }): Promise<void> {
    const result = await this.client.payOutboxEvent.updateMany({ where: { id, publishedAt: null, deadLetteredAt: null, lockedUntil: { not: null } }, data: { lockedUntil: null, nextAttemptAt: input.nextAttemptAt, lastErrorCode: input.errorCode } })
    assertClaim(result.count)
  }

  async markDeadLettered(id: string, deadLetteredAt: Date, errorCode: string): Promise<void> {
    const result = await this.client.payOutboxEvent.updateMany({ where: { id, publishedAt: null, deadLetteredAt: null, lockedUntil: { not: null } }, data: { deadLetteredAt, lockedUntil: null, nextAttemptAt: null, lastErrorCode: errorCode } })
    assertClaim(result.count)
  }

  async prune(publishedBefore: Date, deadLetteredBefore: Date): Promise<number> {
    return (await this.client.payOutboxEvent.deleteMany({ where: { OR: [{ publishedAt: { lt: publishedBefore } }, { deadLetteredAt: { lt: deadLetteredBefore } }] } })).count
  }
}

function assertClaim(count: number): void {
  if (count !== 1) throw new Error("Outbox claim was lost before the state transition")
}

function asPayload(value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Outbox payload must be a JSON object")
  return value as Readonly<Record<string, unknown>>
}
