export interface ProviderInboxEvent {
  readonly id: string
  readonly providerEventId: string
  readonly eventType: string
  readonly payload: Record<string, unknown>
  readonly attempts?: number
  readonly processedTransactionId?: string
}

export interface ProviderEventDependencies {
  readonly postConfirmed: (event: ProviderInboxEvent) => Promise<string>
  readonly markProcessed: (eventId: string, transactionId: string) => Promise<void>
  readonly markRetry?: (eventId: string, attempts: number, message: string) => Promise<void>
  readonly markDeadLetter?: (eventId: string, message: string) => Promise<void>
}

export async function processProviderEvent(event: ProviderInboxEvent, dependencies: ProviderEventDependencies): Promise<string> {
  if (event.processedTransactionId) return event.processedTransactionId
  try {
    const transactionId = await dependencies.postConfirmed(event)
    await dependencies.markProcessed(event.id, transactionId)
    return transactionId
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROVIDER_EVENT_FAILED"
    const attempts = (event.attempts ?? 0) + 1
    if (attempts >= 8) await dependencies.markDeadLetter?.(event.id, message)
    else await dependencies.markRetry?.(event.id, attempts, message)
    throw error
  }
}
