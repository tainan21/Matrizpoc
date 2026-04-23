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

/**
 * Categoria institucional V1.2 (sincronizada com
 * `@matriz/integration-api-contracts/v1/institutional` -> TelemetryCategory).
 *
 * Duplicacao intencional: platform-telemetry nao importa de integration-*
 * para preservar direcao da dependencia (platform e nivel-3 neutro, nao pode
 * depender de layer institucional).
 */
export type InstitutionalTelemetryCategory =
  | "operational"
  | "commercial"
  | "financial"
  | "adoption"
  | "ecosystem"
  | "institutional"

export const INSTITUTIONAL_TELEMETRY_CATEGORIES: readonly InstitutionalTelemetryCategory[] = [
  "operational",
  "commercial",
  "financial",
  "adoption",
  "ecosystem",
  "institutional",
]

export interface TelemetryEnvelope<P extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string
  readonly version: "v1"
  readonly appId: MatrizAppId
  readonly tenantId: TenantId
  readonly type: string
  readonly occurredAt: string
  readonly properties: P
  /**
   * V1.2: categoria institucional opcional. Nao afeta clientes pre-existentes
   * que nao declararam categoria (ficam sem agregacao institucional).
   */
  readonly category?: InstitutionalTelemetryCategory
}

export const telemetryEnvelopeSchema = z.object({
  id: z.string().min(1),
  version: z.literal("v1"),
  appId: z.string().min(1),
  tenantId: z.string().min(1),
  type: z.string().min(1),
  occurredAt: z.string(),
  properties: z.record(z.string(), z.unknown()),
  category: z
    .enum(["operational", "commercial", "financial", "adoption", "ecosystem", "institutional"])
    .optional(),
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
    category?: InstitutionalTelemetryCategory
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
    track({ tenantId, type, properties, category }) {
      const env: TelemetryEnvelope = {
        id: generateId("tel"),
        version: "v1",
        appId,
        tenantId,
        type,
        occurredAt: nowIso(),
        properties: properties ?? {},
        ...(category ? { category } : {}),
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

// ---------------------------------------------------------------------------
// V1.2: institutional summary helpers
// ---------------------------------------------------------------------------

export interface InstitutionalCategoryBucket {
  readonly count: number
  readonly lastEventAt?: string
}

export interface InstitutionalAppSummary {
  readonly appId: MatrizAppId
  readonly total: number
  readonly byCategory: Partial<Record<InstitutionalTelemetryCategory, InstitutionalCategoryBucket>>
  readonly lastEventAt?: string
}

export function summarizeTelemetryByApp(
  envelopes: readonly TelemetryEnvelope[],
): readonly InstitutionalAppSummary[] {
  const byApp = new Map<MatrizAppId, TelemetryEnvelope[]>()
  for (const env of envelopes) {
    const bucket = byApp.get(env.appId) ?? []
    bucket.push(env)
    byApp.set(env.appId, bucket)
  }
  const result: InstitutionalAppSummary[] = []
  for (const [appId, list] of byApp) {
    const byCategory: Partial<Record<InstitutionalTelemetryCategory, InstitutionalCategoryBucket>> =
      {}
    let lastEventAt: string | undefined
    for (const env of list) {
      if (!lastEventAt || env.occurredAt > lastEventAt) lastEventAt = env.occurredAt
      if (!env.category) continue
      const prev = byCategory[env.category]
      byCategory[env.category] = {
        count: (prev?.count ?? 0) + 1,
        lastEventAt:
          !prev?.lastEventAt || env.occurredAt > prev.lastEventAt
            ? env.occurredAt
            : prev.lastEventAt,
      }
    }
    result.push({ appId, total: list.length, byCategory, lastEventAt })
  }
  return result
}
