import type { AppIdLiteral } from "@matriz/foundation-types"
import type { MatrizEventName } from "@matriz/integration-events"
import { getGlobalEventBus, type EventEnvelope } from "@matriz/integration-events"
import type { AggregatedTelemetry } from "../domain/models"

export function aggregateByApp(): Record<AppIdLiteral, AggregatedTelemetry> {
  const bus = getGlobalEventBus()
  const history = bus.history() as readonly EventEnvelope<unknown>[]

  const acc = new Map<AppIdLiteral, AggregatedTelemetry>()

  for (const envelope of history) {
    const app = envelope.sourceApp as AppIdLiteral
    const current: AggregatedTelemetry = acc.get(app) ?? {
      appId: app,
      totalEvents: 0,
      byName: {},
      lastEventAt: undefined,
    }
    const nextByName = { ...current.byName }
    nextByName[envelope.name] = (nextByName[envelope.name] ?? 0) + 1
    const next: AggregatedTelemetry = {
      appId: app,
      totalEvents: current.totalEvents + 1,
      byName: nextByName,
      lastEventAt:
        !current.lastEventAt || envelope.occurredAt > current.lastEventAt
          ? (envelope.occurredAt as AggregatedTelemetry["lastEventAt"])
          : current.lastEventAt,
    }
    acc.set(app, next)
  }

  const out: Partial<Record<AppIdLiteral, AggregatedTelemetry>> = {}
  for (const [k, v] of acc) out[k] = v
  return out as Record<AppIdLiteral, AggregatedTelemetry>
}

export function countEventsByName(name: MatrizEventName): number {
  return getGlobalEventBus()
    .history()
    .filter((e) => e.name === name).length
}
