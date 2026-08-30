import { NextResponse } from "next/server"
import { isSharedCacheOriginAllowed, parseSharedCacheWrite, sharedCacheHeaders } from "../../../../src/ecosystem/shared-cache-contract"
import { getDurableHubRequestContext, HubAuthError, requireSameOrigin } from "../../../../src/auth/hub-session"
import { readBoundedText, RequestBodyTooLargeError } from "../../../../src/http/bounded-body"
import { GarnetHubCacheRepository, loadGarnetCacheConfiguration, type HubCacheRepository } from "../../../../src/ecosystem/garnet-cache-repository"

const MAX_CACHE_WRITE_BYTES = 8 * 1024

const globalCache = globalThis as typeof globalThis & {
  __matrizSharedCacheRepository?: HubCacheRepository
}
function repository(): HubCacheRepository {
  return globalCache.__matrizSharedCacheRepository ??= new GarnetHubCacheRepository(loadGarnetCacheConfiguration(process.env))
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin")
  return isSharedCacheOriginAllowed(origin)
    ? new NextResponse(null, { status: 204, headers: sharedCacheHeaders(origin) })
    : NextResponse.json({ error: "origin not allowed" }, { status: 403 })
}

export async function GET(request: Request) {
  let context
  try { context = await getDurableHubRequestContext(request) } catch (error) { return NextResponse.json({ error: "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } }) }
  const key = new URL(request.url).searchParams.get("key")?.trim()
  const headers = sharedCacheHeaders(request.headers.get("origin"))
  if (!isSharedCacheOriginAllowed(request.headers.get("origin"))) return NextResponse.json({ error: "origin not allowed" }, { status: 403 })
  if (!key || key.length > 64) return NextResponse.json({ error: "valid key is required" }, { status: 400, headers })
  let entry
  try { entry = await repository().read(context.session.activeTenantId, "ecosystem", key) }
  catch { return NextResponse.json({ error: "cache unavailable" }, { status: 503, headers }) }
  if (!entry) return NextResponse.json({ error: "not found" }, { status: 404, headers })
  return NextResponse.json(entry, { headers: { ...headers, "cache-control": "private, no-store" } })
}

export async function PUT(request: Request) {
  let context
  try { requireSameOrigin(request); context = await getDurableHubRequestContext(request) } catch (error) { return NextResponse.json({ error: "Authentication required" }, { status: error instanceof HubAuthError ? error.status : 401, headers: { "cache-control": "private, no-store" } }) }
  const origin = request.headers.get("origin")
  const headers = { ...sharedCacheHeaders(origin), "cache-control": "private, no-store" }
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "invalid cache payload" }, { status: 400, headers })
  let text: string
  try { text = await readBoundedText(request, MAX_CACHE_WRITE_BYTES) } catch (error) {
    return NextResponse.json({ error: "invalid cache payload" }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers })
  }
  const body = parseSharedCacheWrite(tryParseJson(text))
  if (!body) return NextResponse.json({ error: "invalid cache payload" }, { status: 400, headers })
  const entry = {
    key: body.key.trim(),
    value: body.value,
    updatedBy: context.session.identity.user.id,
    updatedAt: new Date().toISOString(),
  }
  try { await repository().write(context.session.activeTenantId, "ecosystem", entry) }
  catch { return NextResponse.json({ error: "cache unavailable" }, { status: 503, headers }) }
  return NextResponse.json(entry, { headers })
}

function tryParseJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return null }
}
