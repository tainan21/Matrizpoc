import type { PayOutboxPublisher } from "./outbox-publisher"

type Publisher = Pick<PayOutboxPublisher, "runBatch" | "prune">
type WorkerReport =
  | Readonly<{ type: "batch"; claimed: number; published: number; retried: number; deadLettered: number }>
  | Readonly<{ type: "prune"; removed: number }>
  | Readonly<{ type: "error"; code: "pay_outbox_batch_failed" | "pay_outbox_prune_failed" }>

export class PayOutboxWorker {
  private running = false

  constructor(private readonly options: Readonly<{ publisher: Publisher; report(event: WorkerReport): void }>) {}

  async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      this.options.report({ type: "batch", ...await this.options.publisher.runBatch() })
    }
    catch {
      this.options.report({ type: "error", code: "pay_outbox_batch_failed" })
    }
    finally {
      this.running = false
    }
  }

  async prune(): Promise<void> {
    try { this.options.report({ type: "prune", removed: await this.options.publisher.prune() }) }
    catch { this.options.report({ type: "error", code: "pay_outbox_prune_failed" }) }
  }
}
