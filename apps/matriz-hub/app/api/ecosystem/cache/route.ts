import { NextResponse } from "next/server"
import { isSharedCacheOriginAllowed, parseSharedCacheWrite, sharedCacheHeaders } from "../../../../src/ecosystem/shared-cache-contract"
import { getHubRequestContext, HubAuthError, requireSameOrigin } from "../../../../src/auth/hub-session"
import { readBoundedText, RequestBodyTooLargeError } from "../../../../src/http/bounded-body"

const MAX_CACHE_WRITE_BYTES = 8 * 1024

interface CacheRecord {
  key: string
  value: unknown
  updatedAt: string
  updatedBy: string
}

const globalCache = globalThis as typeof globalThis & {
  __matrizSharedCache?: Map<string, CacheRecord>
}
const store = globalCache.__matrizSharedCache ??= new Map<string, CacheRecord>()

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin")
  return isSharedCacheOriginAllowed(origin)
    ? new NextResponse(null, { status: 204, headers: sharedCacheHeaders(origin) })
    : NextResponse.json({ error: "origin not allowed" }, { status: 403 })
}

export async function GET(request: Request) {
  let context
  try { context = getHubRequestContext(request) } catch (error) { return NextResponse.json({ error: "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } }) }
  const key = new URL(request.url).searchParams.get("key")?.trim()
  const headers = sharedCacheHeaders(request.headers.get("origin"))
  if (!isSharedCacheOriginAllowed(request.headers.get("origin"))) return NextResponse.json({ error: "origin not allowed" }, { status: 403 })
  if (!key || key.length > 64) return NextResponse.json({ error: "valid key is required" }, { status: 400, headers })
  const entry = store.get(tenantCacheKey(context.session.activeTenantId, key))
  if (!entry) return NextResponse.json({ error: "not found" }, { status: 404, headers })
  return NextResponse.json(entry, { headers: { ...headers, "cache-control": "private, no-store" } })
}

export async function PUT(request: Request) {
  let context
  try { requireSameOrigin(request); context = getHubRequestContext(request) } catch (error) { return NextResponse.json({ error: "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } }) }
  const origin = request.headers.get("origin")
  const headers = { ...sharedCacheHeaders(origin), "cache-control": "private, no-store" }
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "invalid cache payload" }, { status: 400, headers })
  let text: string
  try { text = await readBoundedText(request, MAX_CACHE_WRITE_BYTES) } catch (error) {
    return NextResponse.json({ error: "invalid cache payload" }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers })
  }
  const body = parseSharedCacheWrite(tryParseJson(text))
  if (!body) return NextResponse.json({ error: "invalid cache payload" }, { status: 400, headers })
  const entry: CacheRecord = {
    key: body.key.trim(),
    value: body.value,
    updatedBy: context.session.identity.user.id,
    updatedAt: new Date().toISOString(),
  }
  store.set(tenantCacheKey(context.session.activeTenantId, entry.key), entry)
  return NextResponse.json(entry, { headers })
}

function tryParseJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return null }
}

function tenantCacheKey(tenantId: string, key: string): string {
  return `${tenantId}:${key}`
}
