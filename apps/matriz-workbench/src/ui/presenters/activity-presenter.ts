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

export interface ActivityDayGroup {
  date: string
  label: string
  events: ActivityEventViewModel[]
}

export function groupActivityEventsByDay(events: ActivityEventViewModel[]): ActivityDayGroup[] {
  const groups = new Map<string, ActivityEventViewModel[]>()
  for (const event of events) {
    const date = event.occurredAt.slice(0, 10)
    groups.set(date, [...(groups.get(date) ?? []), event])
  }
  return [...groups.entries()].map(([date, groupedEvents]) => ({
    date,
    label: new Date(`${date}T12:00:00.000Z`).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
    events: groupedEvents,
  }))
}
