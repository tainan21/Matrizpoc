import type {
  NotificationChannel,
  NotificationOutboxItem,
  NotificationProvider,
} from "../../domain/notification"
import { NotificationOutboxStore } from "../../integration/collaboration/notification-outbox-store"

export type NotificationDispatchResult =
  | { status: "idle" }
  | { status: "provider_unavailable"; channel: NotificationChannel }
  | { status: "delivered"; item: NotificationOutboxItem }
  | { status: "failed"; item: NotificationOutboxItem }

export interface NotificationDispatcherOptions {
  deliveryTimeoutMs?: number
}

export class NotificationDispatcher {
  private readonly providers: ReadonlyMap<NotificationChannel, NotificationProvider>
  private readonly deliveryTimeoutMs: number

  constructor(
    private readonly store: NotificationOutboxStore,
    providers: Iterable<NotificationProvider>,
    options: NotificationDispatcherOptions = {},
  ) {
    this.providers = new Map(
      Array.from(providers, (provider) => [provider.channel, provider] as const),
    )
    this.deliveryTimeoutMs = Math.min(
      Math.max(options.deliveryTimeoutMs ?? 10_000, 1_000),
      30_000,
    )
  }

  async deliverNext(
    projectId: string,
    now = new Date(),
  ): Promise<NotificationDispatchResult> {
    await this.store.recoverStaleDeliveries(projectId, now)
    const queued = (await this.store.list(projectId))
      .filter((item) => (
        item.status === "queued"
        && (!item.nextAttemptAt || Date.parse(item.nextAttemptAt) <= now.getTime())
      ))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))

    if (!queued.length) return { status: "idle" }
    const candidate = queued.find((item) => this.providers.has(item.channel))
    if (!candidate) return { status: "provider_unavailable", channel: queued[0].channel }
    const provider = this.providers.get(candidate.channel)!

    const claimed = await this.store.claimForDelivery(
      projectId,
      candidate.id,
      candidate.revision,
      now,
    )

    try {
      const receipt = await this.deliverWithTimeout(provider, claimed)
      const delivered = await this.store.recordDeliverySuccess(
        projectId,
        claimed.id,
        claimed.revision,
        receipt,
        now,
      )
      return { status: "delivered", item: delivered }
    } catch (error) {
      const failed = await this.store.recordDeliveryFailure(
        projectId,
        claimed.id,
        claimed.revision,
        error,
        now,
      )
      return { status: "failed", item: failed }
    }
  }

  private async deliverWithTimeout(
    provider: NotificationProvider,
    item: NotificationOutboxItem,
  ) {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        provider.deliver(item),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Tempo limite do provedor de notificação excedido.")),
            this.deliveryTimeoutMs,
          )
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
}
