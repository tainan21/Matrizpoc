import type { ActivityEvent } from "../../domain/schemas"
import { redactSensitiveText } from "../../domain/redaction"

export interface ActivityEventViewModel {
  id: string
  actor: ActivityEvent["actor"]
  action: string
  summary: string
  entityType: ActivityEvent["entityType"]
  entityId: string
  occurredAt: string
}

export function toActivityEventViewModel(event: ActivityEvent): ActivityEventViewModel {
  return {
    id: event.id,
    actor: event.actor,
    action: event.action,
    summary: redactSensitiveText(event.summary),
    entityType: event.entityType,
    entityId: redactSensitiveText(event.entityId),
    occurredAt: event.occurredAt,
  }
}
