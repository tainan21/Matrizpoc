import type { ClaimedOutboxEvent, OutboxRepository } from "@matriz/integration-event-delivery"
import { getHubWorkerDb, type HubPrismaClient } from "@matriz/platform-db/hub"

type Row = { id: string; tenantId: string; eventName: string; eventVersion: string; payloadJson: unknown; occurredAt: Date; attempts: number }
export class PrismaHubOutboxRepository implements OutboxRepository {
  constructor(private readonly client: HubPrismaClient = getHubWorkerDb()) {}
  async claim(input: { limit: number; lockUntil: Date; now: Date }): Promise<readonly ClaimedOutboxEvent[]> {
    const rows = await this.client.$queryRawUnsafe<Row[]>(`WITH candidate AS (
      SELECT id, attempts FROM hub.outbox_events WHERE "publishedAt" IS NULL AND "deadLetteredAt" IS NULL
      AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= $2) AND ("lockedUntil" IS NULL OR "lockedUntil" < $2)
      ORDER BY "occurredAt", id LIMIT $1 FOR UPDATE SKIP LOCKED)
      UPDATE hub.outbox_events event SET "lockedUntil"=$3, attempts=candidate.attempts+1 FROM candidate WHERE event.id=candidate.id
      RETURNING event.id,event."tenantId",event."eventName",event."eventVersion",event."payloadJson",event."occurredAt",event.attempts`, Math.max(1, Math.min(100, Math.trunc(input.limit))), input.now, input.lockUntil)
    return rows.map((row) => ({ ...row, payload: payload(row.payloadJson) }))
  }
  async markPublished(id: string, publishedAt: Date) { owned((await this.client.hubOutboxEvent.updateMany({ where: { id, publishedAt: null, deadLetteredAt: null, lockedUntil: { not: null } }, data: { publishedAt, lockedUntil: null, nextAttemptAt: null, lastErrorCode: null } })).count) }
  async releaseForRetry(id: string, input: { nextAttemptAt: Date; errorCode: string }) { owned((await this.client.hubOutboxEvent.updateMany({ where: { id, publishedAt: null, deadLetteredAt: null, lockedUntil: { not: null } }, data: { lockedUntil: null, nextAttemptAt: input.nextAttemptAt, lastErrorCode: input.errorCode } })).count) }
  async markDeadLettered(id: string, deadLetteredAt: Date, errorCode: string) { owned((await this.client.hubOutboxEvent.updateMany({ where: { id, publishedAt: null, deadLetteredAt: null, lockedUntil: { not: null } }, data: { deadLetteredAt, lockedUntil: null, nextAttemptAt: null, lastErrorCode: errorCode } })).count) }
  async prune(publishedBefore: Date, deadLetteredBefore: Date) { return (await this.client.hubOutboxEvent.deleteMany({ where: { OR: [{ publishedAt: { lt: publishedBefore } }, { deadLetteredAt: { lt: deadLetteredBefore } }] } })).count }
}
function owned(count: number) { if (count !== 1) throw new Error("Outbox claim was lost before transition") }
function payload(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Outbox payload must be an object"); return value as Record<string, unknown> }
