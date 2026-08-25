import { NextResponse } from "next/server"
import { createMockAuthState, type AuthResult, type AuthSession } from "@matriz/platform-auth"
import { getMockAuthCorsHeaders, isAllowedMockAuthOrigin } from "./mock-auth-cors"
import { HUB_SESSION_COOKIE, hubSessionStore, sessionCookieOptions } from "./hub-session"

const globalState = globalThis as typeof globalThis & { __matrizMockAuth?: ReturnType<typeof createMockAuthState> }
export const mockAuthState = globalState.__matrizMockAuth ??= createMockAuthState()
export const MOCK_SESSION_COOKIE = HUB_SESSION_COOKIE

export function preflight(request: Request) {
  const origin = request.headers.get("origin")
  return isAllowedMockAuthOrigin(origin)
    ? new NextResponse(null, { status: 204, headers: getMockAuthCorsHeaders(origin) })
    : NextResponse.json({ error: { message: "Origem nao permitida." } }, { status: 403 })
}

export function resultResponse<T>(request: Request, result: AuthResult<T>, setSession = false) {
  const origin = request.headers.get("origin")
  if (!isAllowedMockAuthOrigin(origin)) return NextResponse.json({ error: { message: "Origem nao permitida." } }, { status: 403 })
  const headers = getMockAuthCorsHeaders(origin)
  if (!result.ok) {
    const status = result.error.code === "session-expired" ? 410 : result.error.code === "invalid-input" ? 400 : 401
    return NextResponse.json({ error: result.error }, { status, headers })
  }
  const response = NextResponse.json(result.value, { headers })
  if (setSession && isAuthSession(result.value)) response.cookies.set(MOCK_SESSION_COOKIE, hubSessionStore.create(result.value), sessionCookieOptions())
  return response
}

export function sessionResponse(request: Request, session: AuthSession) {
  return resultResponse(request, { ok: true, value: session }, true)
}

export function authRateLimitedResponse(request: Request) {
  const origin = request.headers.get("origin")
  return NextResponse.json({ error: { message: "Too many authentication attempts." } }, { status: 429, headers: { ...getMockAuthCorsHeaders(origin), "cache-control": "no-store" } })
}

export function mockAuthOriginRejected(request: Request) {
  return NextResponse.json({ error: { message: "Origem nao permitida." } }, { status: 403, headers: getMockAuthCorsHeaders(request.headers.get("origin")) })
}

function isAuthSession(value: unknown): value is AuthSession { return typeof value === "object" && value !== null && "identity" in value && "expiresAt" in value }
