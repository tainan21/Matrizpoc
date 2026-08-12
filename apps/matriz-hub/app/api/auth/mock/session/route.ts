import type { MatrizAppId } from "@matriz/foundation-constants"
import { NextResponse } from "next/server"
import { getMockAuthCorsHeaders } from "../../../../../src/auth/mock-auth-cors"
import { MOCK_SESSION_COOKIE, preflight, resultResponse } from "../../../../../src/auth/mock-auth-server"
import { HubAuthError, hubSessionStore, requireSameOrigin, resolveHubSession, sessionCookieOptions, sessionTokenFromRequest } from "../../../../../src/auth/hub-session"
import { readBoundedText } from "../../../../../src/http/bounded-body"

export const OPTIONS = preflight
export async function GET(request: Request) {
  try {
    const shared = resolveHubSession(request)
    return NextResponse.json(shared, { headers: { ...getMockAuthCorsHeaders(request.headers.get("origin")), "cache-control": "private, no-store" } })
  } catch (error) {
    const status = error instanceof HubAuthError ? error.status : 401
    return NextResponse.json({ error: { message: "Sessao nao encontrada." } }, { status, headers: getMockAuthCorsHeaders(request.headers.get("origin")) })
  }
}
export async function POST(request: Request) {
  try { requireSameOrigin(request) } catch { return NextResponse.json({ error: { message: "Origem nao permitida." } }, { status: 403, headers: getMockAuthCorsHeaders(request.headers.get("origin")) }) }
  let shared
  try { shared = resolveHubSession(request) } catch { return NextResponse.json({ error: { message: "Sessao nao encontrada." } }, { status: 401, headers: getMockAuthCorsHeaders(request.headers.get("origin")) }) }
  const body: { appId?: MatrizAppId } = await readBoundedText(request, 8 * 1024).then((text) => JSON.parse(text || "{}") as { appId?: MatrizAppId }).catch(() => ({}))
  if (body.appId) hubSessionStore.recordAppOpen(sessionTokenFromRequest(request), body.appId)
  return NextResponse.json(shared, { headers: { ...getMockAuthCorsHeaders(request.headers.get("origin")), "cache-control": "private, no-store" } })
}
export async function DELETE(request: Request) {
  try { requireSameOrigin(request) } catch { return NextResponse.json({ error: { message: "Origem nao permitida." } }, { status: 403, headers: getMockAuthCorsHeaders(request.headers.get("origin")) }) }
  hubSessionStore.revoke(sessionTokenFromRequest(request))
  const response = resultResponse(request, { ok: true, value: { signedOut: true } })
  response.cookies.set(MOCK_SESSION_COOKIE, "", sessionCookieOptions(0))
  return response
}
