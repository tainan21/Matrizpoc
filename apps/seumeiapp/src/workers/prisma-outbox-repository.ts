import { getSeumeiWorkerDb, type SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import type { ClaimedOutboxEvent, OutboxRepository } from "@matriz/integration-event-delivery"

type OutboxRow = { id: string; tenantId: string; eventName: string; eventVersion: string; payloadJson: unknown; occurredAt: Date; attempts: number }

export class PrismaSeumeiOutboxRepository implements OutboxRepository {
  constructor(private readonly client: SeumeiPrismaClient = getSeumeiWorkerDb()) {}

  async claim(input: { limit: number; lockUntil: Date; now: Date }): Promise<readonly ClaimedOutboxEvent[]> {
    const rows = await this.client.$queryRawUnsafe<OutboxRow[]>(`
      WITH candidate AS (
        SELECT id, attempts FROM seumei.outbox_events
        WHERE "publishedAt" IS NULL AND "deadLetteredAt" IS NULL
          AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= $2)
          AND ("lockedUntil" IS NULL OR "lockedUntil" < $2)
        ORDER BY "occurredAt", id LIMIT $1 FOR UPDATE SKIP LOCKED
      )
      UPDATE seumei.outbox_events AS event
      SET "lockedUntil" = $3, attempts = candidate.attempts + 1
      FROM candidate WHERE event.id = candidate.id
      RETURNING event.id, event."tenantId", event."eventName", event."eventVersion", event."payloadJson", event."occurredAt", event.attempts
    `, Math.max(1, Math.min(100, Math.trunc(input.limit))), input.now, input.lockUntil)
    return rows.map((row) => ({ ...row, payload: asPayload(row.payloadJson) }))
  }

  async markPublished(id: string, publishedAt: Date): Promise<void> { assertClaim((await this.client.seumeiOutboxEvent.updateMany({ where: { id, publishedAt: null, deadLetteredAt: null, lockedUntil: { not: null } }, data: { publishedAt, lockedUntil: null, nextAttemptAt: null, lastErrorCode: null } })).count) }
  async releaseForRetry(id: string, input: { nextAttemptAt: Date; errorCode: string }): Promise<void> { assertClaim((await this.client.seumeiOutboxEvent.updateMany({ where: { id, publishedAt: null, deadLetteredAt: null, lockedUntil: { not: null } }, data: { lockedUntil: null, nextAttemptAt: input.nextAttemptAt, lastErrorCode: input.errorCode } })).count) }
  async markDeadLettered(id: string, deadLetteredAt: Date, errorCode: string): Promise<void> { assertClaim((await this.client.seumeiOutboxEvent.updateMany({ where: { id, publishedAt: null, deadLetteredAt: null, lockedUntil: { not: null } }, data: { deadLetteredAt, lockedUntil: null, nextAttemptAt: null, lastErrorCode: errorCode } })).count) }
  async prune(publishedBefore: Date, deadLetteredBefore: Date): Promise<number> { return (await this.client.seumeiOutboxEvent.deleteMany({ where: { OR: [{ publishedAt: { lt: publishedBefore } }, { deadLetteredAt: { lt: deadLetteredBefore } }] } })).count }
}

function assertClaim(count: number): void { if (count !== 1) throw new Error("Outbox claim was lost before the state transition") }
function asPayload(value: unknown): Readonly<Record<string, unknown>> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Outbox payload must be a JSON object"); return value as Readonly<Record<string, unknown>> }
