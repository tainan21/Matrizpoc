import { NextResponse } from "next/server"
import { isSharedCacheOriginAllowed, parseSharedCacheWrite, sharedCacheHeaders } from "../../../../src/ecosystem/shared-cache-contract"

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
  const key = new URL(request.url).searchParams.get("key")?.trim()
  const headers = sharedCacheHeaders(request.headers.get("origin"))
  if (!isSharedCacheOriginAllowed(request.headers.get("origin"))) return NextResponse.json({ error: "origin not allowed" }, { status: 403 })
  if (!key || key.length > 64) return NextResponse.json({ error: "valid key is required" }, { status: 400, headers })
  const entry = store.get(key)
  if (!entry) return NextResponse.json({ error: "not found" }, { status: 404, headers })
  return NextResponse.json(entry, { headers })
}

export async function PUT(request: Request) {
  const origin = request.headers.get("origin")
  if (!isSharedCacheOriginAllowed(origin)) return NextResponse.json({ error: "origin not allowed" }, { status: 403 })
  const body = parseSharedCacheWrite(await request.json().catch(() => null))
  if (!body) return NextResponse.json({ error: "invalid cache payload" }, { status: 400, headers: sharedCacheHeaders(origin) })
  const entry: CacheRecord = {
    key: body.key.trim(),
    value: body.value,
    updatedBy: body.updatedBy,
    updatedAt: new Date().toISOString(),
  }
  store.set(entry.key, entry)
  return NextResponse.json(entry, { headers: sharedCacheHeaders(origin) })
}
