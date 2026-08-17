import { NextResponse } from "next/server"
import { createMockAuthState, type AuthResult, type AuthSession } from "@matriz/platform-auth"
import { getMockAuthCorsHeaders, isAllowedMockAuthOrigin } from "./mock-auth-cors"

const globalState = globalThis as typeof globalThis & { __matrizMockAuth?: ReturnType<typeof createMockAuthState> }
export const mockAuthState = globalState.__matrizMockAuth ??= createMockAuthState()
export const MOCK_SESSION_COOKIE = "matriz_mock_session"
const requestSessions = new Map<string, AuthSession>()

function readSessionToken(request: Request): string | undefined {
  const pair = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${MOCK_SESSION_COOKIE}=`))
  return pair?.slice(MOCK_SESSION_COOKIE.length + 1)
}

export function getRequestMockSession(request: Request): AuthSession | null {
  const token = readSessionToken(request)
  if (!token) return null
  const session = requestSessions.get(token)
  if (!session || Date.now() >= new Date(session.expiresAt).getTime()) {
    requestSessions.delete(token)
    return null
  }
  return session
}

export function preflight(request: Request) {
  const origin = request.headers.get("origin")
  return isAllowedMockAuthOrigin(origin)
    ? new NextResponse(null, { status: 204, headers: getMockAuthCorsHeaders(origin) })
    : NextResponse.json({ error: { message: "Origem nao permitida." } }, { status: 403 })
}

export function resultResponse<T>(request: Request, result: AuthResult<T>) {
  const origin = request.headers.get("origin")
  if (!isAllowedMockAuthOrigin(origin)) return NextResponse.json({ error: { message: "Origem nao permitida." } }, { status: 403 })
  const headers = getMockAuthCorsHeaders(origin)
  if (!result.ok) {
    const status = result.error.code === "session-expired" ? 410 : result.error.code === "invalid-input" ? 400 : 401
    return NextResponse.json({ error: result.error }, { status, headers })
  }
  return NextResponse.json(result.value, { headers })
}

export function sessionResponse(request: Request, session: AuthSession) {
  const origin = request.headers.get("origin")
  if (!isAllowedMockAuthOrigin(origin)) return NextResponse.json({ error: { message: "Origem nao permitida." } }, { status: 403 })
  const token = crypto.randomUUID()
  requestSessions.set(token, session)
  const response = NextResponse.json(session, { headers: getMockAuthCorsHeaders(origin) })
  response.cookies.set(MOCK_SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 24 * 60 * 60 })
  return response
}

export function hasSessionCookie(request: Request): boolean {
  return getRequestMockSession(request) !== null
}

export function clearRequestMockSession(request: Request): void {
  const token = readSessionToken(request)
  if (token) requestSessions.delete(token)
}
