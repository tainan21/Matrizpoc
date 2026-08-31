import { createConnection } from "node:net"

export interface CacheRecord {
  readonly key: string
  readonly value: unknown
  readonly updatedAt: string
  readonly updatedBy: string
}

export interface HubCacheRepository {
  read(tenantId: string, namespace: "ecosystem" | "docs", key: string): Promise<CacheRecord | undefined>
  write(tenantId: string, namespace: "ecosystem" | "docs", record: CacheRecord, ttlSeconds?: number): Promise<void>
  delete(tenantId: string, namespace: "ecosystem" | "docs", key: string): Promise<void>
}

export interface GarnetCacheConfiguration {
  readonly host: "127.0.0.1"
  readonly port: 46379
  readonly username: "matriz_hub"
  readonly password: string
  readonly defaultTtlSeconds: number
}

const segment = /^[a-zA-Z0-9_-]{1,128}$/
const keySegment = /^[a-zA-Z0-9._-]{1,128}$/

export function createCacheKey(tenantId: string, namespace: "ecosystem" | "docs", key: string): string {
  if (!segment.test(tenantId)) throw new Error("Invalid cache tenant")
  if (namespace !== "ecosystem" && namespace !== "docs") throw new Error("Invalid cache namespace")
  if (!keySegment.test(key)) throw new Error("Invalid cache key")
  return `matriz:v1:matriz-hub:${tenantId}:${namespace}:${key}`
}

export function loadGarnetCacheConfiguration(environment: Readonly<Record<string, string | undefined>>): GarnetCacheConfiguration {
  const value = environment.CACHE_URL
  let url: URL
  try { url = new URL(value ?? "") } catch { throw new Error("CACHE_URL must be the managed Garnet endpoint") }
  if (url.protocol !== "redis:" || url.hostname !== "127.0.0.1" || url.port !== "46379" || url.pathname !== "" || url.username || url.password || url.search || url.hash) throw new Error("CACHE_URL must be redis://127.0.0.1:46379 without credentials")
  if (environment.HUB_CACHE_USERNAME !== "matriz_hub") throw new Error("HUB_CACHE_USERNAME must be matriz_hub")
  const password = environment.HUB_CACHE_PASSWORD ?? ""
  if (password.length < 32) throw new Error("HUB_CACHE_PASSWORD must contain at least 32 characters")
  const defaultTtlSeconds = Number(environment.HUB_CACHE_DEFAULT_TTL_SECONDS ?? "300")
  if (!Number.isSafeInteger(defaultTtlSeconds) || defaultTtlSeconds < 1 || defaultTtlSeconds > 604_800) throw new Error("Cache TTL must be between 1 and 604800 seconds")
  return { host: "127.0.0.1", port: 46379, username: "matriz_hub", password, defaultTtlSeconds }
}

export type GarnetCommandExecutor = (config: GarnetCacheConfiguration, command: readonly string[]) => Promise<RespValue>

export class GarnetHubCacheRepository implements HubCacheRepository {
  constructor(private readonly config: GarnetCacheConfiguration, private readonly execute: GarnetCommandExecutor = executeResp) {}

  async read(tenantId: string, namespace: "ecosystem" | "docs", key: string): Promise<CacheRecord | undefined> {
    const result = await this.execute(this.config, ["GET", createCacheKey(tenantId, namespace, key)])
    if (result === null) return undefined
    if (typeof result !== "string" || Buffer.byteLength(result) > 16 * 1024) throw new Error("Garnet returned an invalid cache value")
    const parsed: unknown = JSON.parse(result)
    if (!parsed || typeof parsed !== "object") throw new Error("Garnet returned an invalid cache value")
    const record = parsed as Record<string, unknown>
    if (typeof record.key !== "string" || typeof record.updatedAt !== "string" || typeof record.updatedBy !== "string") throw new Error("Garnet returned an invalid cache value")
    return { key: record.key, value: record.value, updatedAt: record.updatedAt, updatedBy: record.updatedBy }
  }

  async write(tenantId: string, namespace: "ecosystem" | "docs", record: CacheRecord, ttlSeconds = this.config.defaultTtlSeconds): Promise<void> {
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 604_800) throw new Error("Cache TTL must be between 1 and 604800 seconds")
    const payload = JSON.stringify(record)
    if (Buffer.byteLength(payload) > 8 * 1024) throw new Error("Cache value exceeds 8192 bytes")
    const result = await this.execute(this.config, ["SET", createCacheKey(tenantId, namespace, record.key), payload, "EX", String(ttlSeconds)])
    if (result !== "OK") throw new Error("Garnet rejected the cache write")
  }

  async delete(tenantId: string, namespace: "ecosystem" | "docs", key: string): Promise<void> {
    await this.execute(this.config, ["DEL", createCacheKey(tenantId, namespace, key)])
  }
}

export type RespValue = string | number | null

async function executeResp(config: GarnetCacheConfiguration, command: readonly string[]): Promise<RespValue> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: config.host, port: config.port })
    let buffer = Buffer.alloc(0)
    let settled = false
    const finish = (error?: Error, value?: RespValue) => { if (settled) return; settled = true; socket.destroy(); error ? reject(error) : resolve(value ?? null) }
    socket.setTimeout(2_000)
    socket.once("timeout", () => finish(new Error("Garnet request timed out")))
    socket.once("error", () => finish(new Error("Garnet is unavailable")))
    socket.once("connect", () => socket.write(Buffer.concat([encodeResp(["AUTH", config.username, config.password]), encodeResp(command)])))
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk])
      try {
        const auth = parseResp(buffer, 0)
        if (!auth) return
        if (auth.value !== "OK") return finish(new Error("Garnet authentication failed"))
        const result = parseResp(buffer, auth.offset)
        if (!result) return
        finish(undefined, result.value)
      }
      catch (error) { finish(error instanceof Error ? error : new Error("Invalid Garnet response")) }
    })
  })
}

function encodeResp(parts: readonly string[]): Buffer {
  const chunks = [`*${parts.length}\r\n`, ...parts.flatMap((part) => [`$${Buffer.byteLength(part)}\r\n`, part, "\r\n"])]
  return Buffer.from(chunks.join(""), "utf8")
}

function parseResp(buffer: Buffer, start: number): { value: RespValue; offset: number } | undefined {
  const lineEnd = buffer.indexOf("\r\n", start)
  if (lineEnd < 0) return undefined
  const prefix = String.fromCharCode(buffer[start] ?? 0)
  const text = buffer.toString("utf8", start + 1, lineEnd)
  if (prefix === "+") return { value: text, offset: lineEnd + 2 }
  if (prefix === "-") throw new Error("Garnet rejected the command")
  if (prefix === ":") return { value: Number(text), offset: lineEnd + 2 }
  if (prefix !== "$") throw new Error("Invalid Garnet response")
  const length = Number(text)
  if (length === -1) return { value: null, offset: lineEnd + 2 }
  if (!Number.isSafeInteger(length) || length < 0 || length > 16 * 1024) throw new Error("Invalid Garnet response")
  const valueStart = lineEnd + 2
  const valueEnd = valueStart + length
  if (buffer.length < valueEnd + 2) return undefined
  return { value: buffer.toString("utf8", valueStart, valueEnd), offset: valueEnd + 2 }
}
