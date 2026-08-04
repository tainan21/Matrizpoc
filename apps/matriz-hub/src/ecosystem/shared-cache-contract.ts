import type { MatrizAppId } from "@matriz/foundation-constants"

const APP_IDS = new Set<MatrizAppId>(["matriz-hub", "spot", "seumei", "contracts", "willdash", "matriz-workbench", "sites"])
const ORIGINS = new Set([
  ...Array.from({ length: 7 }, (_, index) => `http://localhost:${3000 + index}`),
  "http://127.0.0.1:3005", "http://127.0.0.1:3006",
])

export interface SharedCacheWrite {
  readonly key: string
  readonly value: string
  readonly updatedBy: MatrizAppId
}

export function parseSharedCacheWrite(input: unknown): SharedCacheWrite | undefined {
  if (!input || typeof input !== "object") return undefined
  const row = input as Record<string, unknown>
  if (typeof row.key !== "string" || !row.key.trim() || row.key.length > 64) return undefined
  if (typeof row.value !== "string" || row.value.length > 500) return undefined
  if (typeof row.updatedBy !== "string" || !APP_IDS.has(row.updatedBy as MatrizAppId)) return undefined
  return { key: row.key.trim(), value: row.value, updatedBy: row.updatedBy as MatrizAppId }
}

export function sharedCacheHeaders(origin: string | null): Record<string, string> {
  return {
    ...(origin && ORIGINS.has(origin) ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-methods": "GET, PUT, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  }
}

export function isSharedCacheOriginAllowed(origin: string | null): boolean {
  return origin === null || ORIGINS.has(origin)
}
