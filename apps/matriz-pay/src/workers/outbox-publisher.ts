import { manifest } from "../manifest/manifest"

export type ClaimedOutboxEvent = Readonly<{
  id: string
  eventName: string
  eventVersion: string
  payload: Readonly<Record<string, unknown>>
  occurredAt: Date
  attempts: number
}>

export interface PayOutboxRepository {
  claim(input: { limit: number; lockUntil: Date; now: Date }): Promise<readonly ClaimedOutboxEvent[]>
  markPublished(id: string, publishedAt: Date): Promise<void>
  releaseForRetry(id: string, input: { nextAttemptAt: Date; errorCode: string }): Promise<void>
  markDeadLettered(id: string, deadLetteredAt: Date, errorCode: string): Promise<void>
  prune(publishedBefore: Date, deadLetteredBefore: Date): Promise<number>
}

export type JetStreamMessage = Readonly<{
  subject: string
  messageId: string
  data: Readonly<Record<string, unknown>>
}>

export interface PayJetStreamTransport {
  publish(message: JetStreamMessage): Promise<void>
  publishDeadLetter?(message: JetStreamMessage): Promise<void>
}

type Options = Readonly<{
  repository: PayOutboxRepository
  transport: PayJetStreamTransport
  now(): Date
  batchSize?: number
  maxAttempts?: number
}>

export class PayOutboxPublisher {
  constructor(private readonly options: Options) {}

  async runBatch(): Promise<Readonly<{ claimed: number; published: number; retried: number; deadLettered: number }>> {
    const now = this.options.now()
    const events = await this.options.repository.claim({ limit: this.options.batchSize ?? 50, now, lockUntil: new Date(now.getTime() + 30_000) })
    let published = 0
    let retried = 0
    let deadLettered = 0
    for (const event of events) {
      if (!(manifest.eventsProduced as readonly string[]).includes(event.eventName)) {
        await this.options.repository.markDeadLettered(event.id, now, "event_not_declared")
        deadLettered += 1
        continue
      }
      const message = eventMessage(event)
      try {
        await this.options.transport.publish(message)
        await this.options.repository.markPublished(event.id, now)
        published += 1
      }
      catch {
        if (event.attempts >= (this.options.maxAttempts ?? 10) && this.options.transport.publishDeadLetter) {
          try {
            await this.options.transport.publishDeadLetter({ ...message, subject: "matriz.v1.pay.dead-letter" })
            await this.options.repository.markDeadLettered(event.id, now, "retry_budget_exhausted")
            deadLettered += 1
            continue
          }
          catch { /* retry the authoritative outbox record */ }
        }
        const delay = Math.min(60_000, 1_000 * 2 ** Math.min(event.attempts, 6))
        await this.options.repository.releaseForRetry(event.id, { nextAttemptAt: new Date(now.getTime() + delay), errorCode: "publish_failed" })
        retried += 1
      }
    }
    return { claimed: events.length, published, retried, deadLettered }
  }

  prune(): Promise<number> {
    const now = this.options.now()
    return this.options.repository.prune(new Date(now.getTime() - 7 * 86_400_000), new Date(now.getTime() - 30 * 86_400_000))
  }
}

function eventMessage(event: ClaimedOutboxEvent): JetStreamMessage {
  return {
    subject: `matriz.v1.pay.${event.eventName}`,
    messageId: event.id,
    data: {
      id: event.id,
      name: event.eventName,
      version: event.eventVersion,
      sourceApp: "matriz-pay",
      tenantId: null,
      occurredAt: event.occurredAt.toISOString(),
      payload: event.payload,
    },
  }
}
