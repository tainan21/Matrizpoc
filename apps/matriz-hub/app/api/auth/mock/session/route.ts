import type { MatrizAppId } from "@matriz/foundation-constants"
import { NextResponse } from "next/server"
import { getMockAuthCorsHeaders } from "../../../../../src/auth/mock-auth-cors"
import { MOCK_SESSION_COOKIE, hasSessionCookie, mockAuthState, preflight, resultResponse } from "../../../../../src/auth/mock-auth-server"

export const OPTIONS = preflight
export async function GET(request: Request) {
  if (!hasSessionCookie(request)) return NextResponse.json({ error: { message: "Sessao nao encontrada." } }, { status: 401, headers: getMockAuthCorsHeaders(request.headers.get("origin")) })
  const shared = mockAuthState.restoreSession()
  return shared
    ? NextResponse.json(shared, { headers: getMockAuthCorsHeaders(request.headers.get("origin")) })
    : NextResponse.json({ error: { message: "Sessao expirada." } }, { status: 401, headers: getMockAuthCorsHeaders(request.headers.get("origin")) })
}
export async function POST(request: Request) {
  if (!hasSessionCookie(request)) return NextResponse.json({ error: { message: "Sessao nao encontrada." } }, { status: 401, headers: getMockAuthCorsHeaders(request.headers.get("origin")) })
  const body = await request.json().catch(() => ({})) as { appId?: MatrizAppId }
  if (body.appId) mockAuthState.recordAppOpen(body.appId)
  return NextResponse.json(mockAuthState.restoreSession(), { headers: getMockAuthCorsHeaders(request.headers.get("origin")) })
}
export async function DELETE(request: Request) {
  mockAuthState.signOut()
  const response = resultResponse(request, { ok: true, value: { signedOut: true } })
  response.cookies.set(MOCK_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 })
  return response
}
