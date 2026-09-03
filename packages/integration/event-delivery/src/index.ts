import { jetstream, type JetStreamClient } from "@nats-io/jetstream"
import { connect as connectNats, type NatsConnection } from "@nats-io/transport-node"

export type ClaimedOutboxEvent = Readonly<{
  id: string
  eventName: string
  eventVersion: string
  tenantId: string | null
  payload: Readonly<Record<string, unknown>>
  occurredAt: Date
  attempts: number
}>

export interface OutboxRepository {
  claim(input: { limit: number; lockUntil: Date; now: Date }): Promise<readonly ClaimedOutboxEvent[]>
  markPublished(id: string, publishedAt: Date): Promise<void>
  releaseForRetry(id: string, input: { nextAttemptAt: Date; errorCode: string }): Promise<void>
  markDeadLettered(id: string, deadLetteredAt: Date, errorCode: string): Promise<void>
  prune(publishedBefore: Date, deadLetteredBefore: Date): Promise<number>
}

export type InboxEnvelope = Readonly<{
  id: string
  name: string
  version: string
  sourceApp: string
  tenantId: string | null
  occurredAt: string
  payload: Readonly<Record<string, unknown>>
}>

export interface InboxMessage {
  readonly subject: string
  readonly data: unknown
  ack(): Promise<void>
  retry(): Promise<void>
  terminate(): Promise<void>
}

export interface InboxRepository<Transaction> {
  processOnce(
    envelope: InboxEnvelope,
    handler: (transaction: Transaction) => Promise<void>,
  ): Promise<"processed" | "duplicate">
}

export type DurableInboxConsumerOptions<Transaction> = Readonly<{
  repository: InboxRepository<Transaction>
  declaredEvents: readonly string[]
  handle(envelope: InboxEnvelope, transaction: Transaction): Promise<void>
}>

export class DurableInboxConsumer<Transaction = unknown> {
  private readonly declaredEvents: ReadonlySet<string>

  constructor(private readonly options: DurableInboxConsumerOptions<Transaction>) {
    this.declaredEvents = new Set(options.declaredEvents)
  }

  async consume(message: InboxMessage): Promise<"processed" | "duplicate" | "retry" | "terminated"> {
    const envelope = parseInboxEnvelope(message.data, message.subject)
    if (!envelope || !this.declaredEvents.has(envelope.name)) {
      await message.terminate()
      return "terminated"
    }
    try {
      const result = await this.options.repository.processOnce(
        envelope,
        (transaction) => this.options.handle(envelope, transaction),
      )
      await message.ack()
      return result
    } catch {
      await message.retry()
      return "retry"
    }
  }
}

function parseInboxEnvelope(value: unknown, subject: string): InboxEnvelope | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  const id = boundedText(input.id, 200)
  const name = boundedText(input.name, 120)
  const version = boundedText(input.version, 30)
  const sourceApp = boundedText(input.sourceApp, 100)
  const occurredAt = boundedText(input.occurredAt, 40)
  const tenantId = input.tenantId === null ? null : boundedText(input.tenantId, 200)
  const payload = input.payload
  if (!id || !name || !version || !sourceApp || !occurredAt || tenantId === undefined) return null
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null
  if (!Number.isFinite(Date.parse(occurredAt))) return null
  if (!/^matriz\.v1\.[a-z0-9-]+\.[a-z0-9.-]+$/.test(subject) || !subject.endsWith(`.${name}`)) return null
  return { id, name, version, sourceApp, tenantId, occurredAt, payload: payload as Readonly<Record<string, unknown>> }
}

function boundedText(value: unknown, maximum: number): string | undefined {
  if (typeof value !== "string") return undefined
  const text = value.trim()
  return text && text.length <= maximum ? text : undefined
}

export type JetStreamMessage = Readonly<{
  subject: string
  messageId: string
  data: Readonly<Record<string, unknown>>
}>

export interface JetStreamTransport {
  publish(message: JetStreamMessage): Promise<void>
  publishDeadLetter?(message: JetStreamMessage): Promise<void>
}

export type DurableOutboxPublisherOptions = Readonly<{
  repository: OutboxRepository
  transport: JetStreamTransport
  sourceApp: string
  domain: string
  declaredEvents: readonly string[]
  now(): Date
  batchSize?: number
  maxAttempts?: number
}>

export class DurableOutboxPublisher {
  private readonly declaredEvents: ReadonlySet<string>

  constructor(private readonly options: DurableOutboxPublisherOptions) {
    this.declaredEvents = new Set(options.declaredEvents)
  }

  async runBatch(): Promise<Readonly<{ claimed: number; published: number; retried: number; deadLettered: number }>> {
    const now = this.options.now()
    const events = await this.options.repository.claim({
      limit: this.options.batchSize ?? 50,
      now,
      lockUntil: new Date(now.getTime() + 30_000),
    })
    let published = 0
    let retried = 0
    let deadLettered = 0

    for (const event of events) {
      if (!this.declaredEvents.has(event.eventName)) {
        await this.options.repository.markDeadLettered(event.id, now, "event_not_declared")
        deadLettered += 1
        continue
      }

      const message = this.eventMessage(event)
      try {
        await this.options.transport.publish(message)
        await this.options.repository.markPublished(event.id, now)
        published += 1
      } catch {
        if (event.attempts >= (this.options.maxAttempts ?? 10) && this.options.transport.publishDeadLetter) {
          try {
            await this.options.transport.publishDeadLetter({
              ...message,
              subject: `matriz.v1.${this.options.domain}.dead-letter`,
            })
            await this.options.repository.markDeadLettered(event.id, now, "retry_budget_exhausted")
            deadLettered += 1
            continue
          } catch {
            // The outbox row remains authoritative and is released for another attempt.
          }
        }
        const delay = Math.min(60_000, 1_000 * 2 ** Math.min(event.attempts, 6))
        await this.options.repository.releaseForRetry(event.id, {
          nextAttemptAt: new Date(now.getTime() + delay),
          errorCode: "publish_failed",
        })
        retried += 1
      }
    }

    return { claimed: events.length, published, retried, deadLettered }
  }

  prune(): Promise<number> {
    const now = this.options.now()
    return this.options.repository.prune(
      new Date(now.getTime() - 7 * 86_400_000),
      new Date(now.getTime() - 30 * 86_400_000),
    )
  }

  private eventMessage(event: ClaimedOutboxEvent): JetStreamMessage {
    const eventSubject = event.eventName.startsWith(`${this.options.domain}.`)
      ? event.eventName.slice(this.options.domain.length + 1)
      : event.eventName
    return {
      subject: `matriz.v1.${this.options.domain}.${eventSubject}`,
      messageId: event.id,
      data: {
        id: event.id,
        name: event.eventName,
        version: event.eventVersion,
        sourceApp: this.options.sourceApp,
        tenantId: event.tenantId,
        occurredAt: event.occurredAt.toISOString(),
        payload: event.payload,
      },
    }
  }
}

export type ManagedNatsConfig = Readonly<{
  url: "nats://127.0.0.1:54222"
  username: string
  password: string
  connectionName: string
}>

export type ConnectedJetStreamTransport = Readonly<{
  client: Pick<JetStreamClient, "publish">
  close(): Promise<void>
}>

export type JetStreamConnector = (config: ManagedNatsConfig) => Promise<ConnectedJetStreamTransport>

export class ManagedJetStreamTransport implements JetStreamTransport {
  private connection?: Promise<ConnectedJetStreamTransport>

  constructor(private readonly config: ManagedNatsConfig, private readonly connector: JetStreamConnector = connectTransport) {}

  publish(message: JetStreamMessage): Promise<void> {
    return this.publishWithAck(message)
  }

  publishDeadLetter(message: JetStreamMessage): Promise<void> {
    return this.publishWithAck(message)
  }

  async close(): Promise<void> {
    if (!this.connection) return
    const connection = await this.connection
    this.connection = undefined
    await connection.close()
  }

  private async publishWithAck(message: JetStreamMessage): Promise<void> {
    const connection = await (this.connection ??= this.connector(this.config))
    await connection.client.publish(
      message.subject,
      new TextEncoder().encode(JSON.stringify(message.data)),
      { msgID: message.messageId, timeout: 5_000 },
    )
  }
}

async function connectTransport(config: ManagedNatsConfig): Promise<ConnectedJetStreamTransport> {
  const connection: NatsConnection = await connectNats({
    servers: config.url,
    user: config.username,
    pass: config.password,
    name: config.connectionName,
  })
  return {
    client: jetstream(connection),
    close: async () => { await connection.drain() },
  }
}
