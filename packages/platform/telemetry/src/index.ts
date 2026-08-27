/**
 * @matriz/platform-telemetry
 *
 * Base telemetry engine for the ecosystem. Defines the envelope shape and a
 * pluggable persistent sink. Each app instantiates `createTelemetryClient(appId)`
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
  flush(): Promise<void>
  pending(): number
}

export interface TelemetrySink {
  write(events: readonly TelemetryEnvelope[]): Promise<void>
}

export interface TelemetryClientOptions {
  readonly sink?: TelemetrySink
  readonly maxBatchSize?: number
  readonly autoFlush?: boolean
}

const sensitivePropertyNames = new Set([
  "email", "name", "displayname", "cookie", "token", "authorization", "body",
  "password", "secret", "amountminor", "pixkey", "document", "cpf", "cnpj",
])

export function assertSafeTelemetryProperties(value: unknown, path = "properties"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeTelemetryProperties(item, `${path}[${index}]`))
    return
  }
  if (!value || typeof value !== "object") return
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (sensitivePropertyNames.has(key.toLowerCase())) {
      throw new Error(`Sensitive telemetry property is forbidden: ${path}.${key}`)
    }
    assertSafeTelemetryProperties(item, `${path}.${key}`)
  }
}

export function createTelemetryClient(appId: MatrizAppId, options: TelemetryClientOptions = {}): TelemetryClient {
  const events: TelemetryEnvelope[] = []
  const pending: TelemetryEnvelope[] = []
  const listeners = new Set<(e: TelemetryEnvelope) => void>()
  const maxBatchSize = options.maxBatchSize ?? 100
  let flushing: Promise<void> | undefined
  const flushPending = async (): Promise<void> => {
    if (!options.sink || pending.length === 0) return
    if (flushing) return flushing
    flushing = (async () => {
      while (pending.length > 0) {
        const batch = pending.slice(0, maxBatchSize)
        await options.sink!.write(batch)
        pending.splice(0, batch.length)
      }
    })().finally(() => { flushing = undefined })
    return flushing
  }

  return {
    appId,
    track({ tenantId, type, properties, category }) {
      assertSafeTelemetryProperties(properties ?? {})
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
      if (options.sink) pending.push(env)
      for (const l of listeners) l(env)
      if (options.sink && options.autoFlush) queueMicrotask(() => { void flushPending().catch(() => undefined) })
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
    async flush() {
      await flushPending()
    },
    pending: () => pending.length,
  }
}

export function environmentTelemetryOptions(): TelemetryClientOptions {
  if (typeof window !== "undefined") return {}
  const token = process.env.MATRIZ_TELEMETRY_INGEST_TOKEN
  const endpoint = process.env.MATRIZ_TELEMETRY_INGEST_URL ?? "http://127.0.0.1:3000/api/v1/telemetry/batches"
  return token ? { sink: createHttpTelemetrySink({ endpoint, token }), autoFlush: true } : {}
}

type TelemetryFetch = (input: string, init: RequestInit) => Promise<Response>

export function createHttpTelemetrySink(input: {
  readonly endpoint: string
  readonly token: string
  readonly fetcher?: TelemetryFetch
}): TelemetrySink {
  const endpoint = new URL(input.endpoint)
  if (endpoint.protocol !== "https:" && endpoint.hostname !== "127.0.0.1" && endpoint.hostname !== "localhost") {
    throw new Error("Telemetry endpoint must use HTTPS outside loopback")
  }
  if (input.token.length < 8) throw new Error("Telemetry service token is required")
  const fetcher = input.fetcher ?? fetch
  return {
    async write(events) {
      if (events.length === 0 || events.length > 100) throw new Error("Telemetry batch size must be between 1 and 100")
      const response = await fetcher(endpoint.toString(), {
        method: "POST",
        headers: { authorization: `Bearer ${input.token}`, "content-type": "application/json" },
        body: JSON.stringify({ contractVersion: "v1", events }),
      })
      if (!response.ok) throw new Error(`Telemetry ingestion failed with status ${response.status}`)
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
