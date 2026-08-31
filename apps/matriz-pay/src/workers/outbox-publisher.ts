import {
  DurableOutboxPublisher,
  type ClaimedOutboxEvent,
  type DurableOutboxPublisherOptions,
  type JetStreamMessage,
  type JetStreamTransport,
  type OutboxRepository,
} from "@matriz/integration-event-delivery"
import { manifest } from "../manifest/manifest"

export type { ClaimedOutboxEvent, JetStreamMessage }
export type PayOutboxRepository = OutboxRepository
export type PayJetStreamTransport = JetStreamTransport

type Options = Omit<DurableOutboxPublisherOptions, "sourceApp" | "domain" | "declaredEvents">

export class PayOutboxPublisher extends DurableOutboxPublisher {
  constructor(options: Options) {
    super({ ...options, sourceApp: manifest.appId, domain: "pay", declaredEvents: manifest.eventsProduced })
  }
}
