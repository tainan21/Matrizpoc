/**
 * @matriz/platform-telemetry
 *
 * Base telemetry engine for the ecosystem. Defines the envelope shape and a
 * mock in-memory sink. Each app instantiates `createTelemetryClient(appId)`
 * via its bootstrap (L11) and sends domain-agnostic envelopes; the hub can
 * later read the collected events.
 *
 * L12: no app concepts are emitted from here; envelopes are generic.
 */
import type { MatrizAppId } from "@matriz/foundation-constants"
import { generateId, nowIso } from "@matriz/foundation-utils"
import type { TenantId } from "@matriz/foundation-types"
import { z } from "@matriz/foundation-schemas"

export const PLATFORM_TELEMETRY_VERSION = "0.1.0" as const

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export interface TelemetryEnvelope<P extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string
  readonly version: "v1"
  readonly appId: MatrizAppId
  readonly tenantId: TenantId
  readonly type: string
  readonly occurredAt: string
  readonly properties: P
}

export const telemetryEnvelopeSchema = z.object({
  id: z.string().min(1),
  version: z.literal("v1"),
  appId: z.string().min(1),
  tenantId: z.string().min(1),
  type: z.string().min(1),
  occurredAt: z.string(),
  properties: z.record(z.string(), z.unknown()),
})

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface TelemetryClient {
  readonly appId: MatrizAppId
  track<P extends Record<string, unknown>>(input: {
    tenantId: TenantId
    type: string
    properties?: P
  }): TelemetryEnvelope
  list(): readonly TelemetryEnvelope[]
  clear(): void
  subscribe(listener: (env: TelemetryEnvelope) => void): () => void
}

export function createTelemetryClient(appId: MatrizAppId): TelemetryClient {
  const events: TelemetryEnvelope[] = []
  const listeners = new Set<(e: TelemetryEnvelope) => void>()

  return {
    appId,
    track({ tenantId, type, properties }) {
      const env: TelemetryEnvelope = {
        id: generateId("tel"),
        version: "v1",
        appId,
        tenantId,
        type,
        occurredAt: nowIso(),
        properties: properties ?? {},
      }
      events.unshift(env)
      for (const l of listeners) l(env)
      return env
    },
    list: () => [...events],
    clear() {
      events.length = 0
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

// ---------------------------------------------------------------------------
// Global in-memory aggregator (for hub's telemetry explorer)
// ---------------------------------------------------------------------------

const _globalClients = new Map<MatrizAppId, TelemetryClient>()

export function registerTelemetryClient(client: TelemetryClient): void {
  _globalClients.set(client.appId, client)
}

export function getAllTelemetryClients(): readonly TelemetryClient[] {
  return [..._globalClients.values()]
}

export function collectAllTelemetry(): readonly TelemetryEnvelope[] {
  const all: TelemetryEnvelope[] = []
  for (const client of _globalClients.values()) all.push(...client.list())
  return all.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
}
