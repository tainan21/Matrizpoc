import type { DeliveryReceipt } from "../../domain/delivery"

export interface DeliveryDraft {
  provider: "github"
  kind: "issue"
  title: string
  body: string
  labels: string[]
  idempotencyKey: string
}

/**
 * Optional outbound boundary. Git-backed Workbench files remain canonical;
 * providers only publish a projection and return a link.
 */
export interface DeliveryProvider {
  readonly id: DeliveryDraft["provider"]
  publish(draft: DeliveryDraft): Promise<DeliveryReceipt>
}
