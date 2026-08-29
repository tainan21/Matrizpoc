import { randomBytes } from "node:crypto"
import type { AuthSession, RecentAppAccess } from "@matriz/platform-auth"
import { resolveOidcServerSession, type OidcAuthorizationContext } from "@matriz/platform-auth/server"

export const HUB_SESSION_COOKIE = "matriz_mock_session"
const SESSION_LIMIT = 512
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 30
const RATE_ENTRY_LIMIT = 1024
const rateEntries = new Map<string, { count: number; startedAt: number }>()

export class HubAuthError extends Error {
  constructor(readonly status: 401 | 403, message = status === 401 ? "Authentication required" : "Access denied") {
    super(message)
  }
}
export class HubRateLimitError extends Error { constructor() { super("Rate limit exceeded") } }

type StoredSession = { session: AuthSession; recentApps: RecentAppAccess[] }
export type HubSessionStore = {
  create(session: AuthSession): string
  resolve(token: string | undefined): StoredSession | null
  revoke(token: string | undefined): void
  recordAppOpen(token: string | undefined, appId: RecentAppAccess["appId"]): StoredSession | null
}

export function createHubSessionStore(options: { now?: () => Date; randomToken?: () => string } = {}): HubSessionStore {
  const now = options.now ?? (() => new Date())
  const randomToken = options.randomToken ?? (() => randomBytes(32).toString("base64url"))
  const sessions = new Map<string, StoredSession>()
  const active = (token: string | undefined): StoredSession | null => {
    if (!token) return null
    const value = sessions.get(token)
    if (!value) return null
    if (new Date(value.session.expiresAt).getTime() <= now().getTime()) {
      sessions.delete(token)
      return null
    }
    return value
  }
  return {
    create(session) {
      if (sessions.size >= SESSION_LIMIT) sessions.delete(sessions.keys().next().value as string)
      const token = randomToken()
      sessions.set(token, { session, recentApps: [] })
      return token
    },
    resolve: active,
    revoke(token) { if (token) sessions.delete(token) },
    recordAppOpen(token, appId) {
      const value = active(token)
      if (!value) return null
      value.recentApps = [{ appId, openedAt: now().toISOString() }, ...value.recentApps.filter((item) => item.appId !== appId)].slice(0, 7)
      return value
    },
  }
}

const globalStore = globalThis as typeof globalThis & { __matrizHubSessions?: HubSessionStore }
export const hubSessionStore = globalStore.__matrizHubSessions ??= createHubSessionStore()

function cookieToken(request: Request): string | undefined {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${HUB_SESSION_COOKIE}=`))?.slice(HUB_SESSION_COOKIE.length + 1)
}

export function resolveHubSession(request: Request, store = hubSessionStore): StoredSession {
  const oidc = resolveOidcServerSession(request)
  if (oidc) {
    if (oidc.context.appId !== "matriz-hub") throw new HubAuthError(403)
    return { session: oidc.session, recentApps: [] }
  }
  if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_MATRIZ_AUTH_ADAPTER !== "mock") throw new HubAuthError(401)
  const stored = store.resolve(cookieToken(request))
  if (!stored) throw new HubAuthError(401)
  return stored
}

export type HubRequestContext = { session: AuthSession; token: string; authorizationContext?: OidcAuthorizationContext }
export function getHubRequestContext(request: Request, store = hubSessionStore): HubRequestContext {
  const oidc = resolveOidcServerSession(request)
  if (oidc) {
    if (oidc.context.appId !== "matriz-hub") throw new HubAuthError(403)
    return { session: oidc.session, token: oidc.opaqueId, authorizationContext: oidc.context }
  }
  if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_MATRIZ_AUTH_ADAPTER !== "mock") throw new HubAuthError(401)
  const token = cookieToken(request)
  const stored = store.resolve(token)
  if (!stored || !token) throw new HubAuthError(401)
  const tenant = stored.session.identity.tenants.find((candidate) => candidate.tenantId === stored.session.activeTenantId)
  if (!tenant || !tenant.enabledApps.includes("matriz-hub" as never)) throw new HubAuthError(403)
  return {
    session: stored.session,
    token,
  }
}

export async function getDurableHubRequestContext(request: Request): Promise<HubRequestContext> {
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_MATRIZ_AUTH_ADAPTER === "mock") {
    return getHubRequestContext(request)
  }
  const { resolveSession } = await import("./oidc.server")
  const oidc = await resolveSession(request)
  if (!oidc) throw new HubAuthError(401)
  if (oidc.context.appId !== "matriz-hub") throw new HubAuthError(403)
  return { session: oidc.session, token: oidc.opaqueId, authorizationContext: oidc.context }
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge }
}

export function sessionTokenFromRequest(request: Request): string | undefined { return cookieToken(request) }

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("origin")
  if (!origin || origin === "null" || origin !== new URL(request.url).origin) throw new HubAuthError(403)
}

/** Bounded in-memory guard keyed only by the authenticated principal, never by proxy/IP headers. */
export function allowHubRequest(principalId: string, now = Date.now(), limit = RATE_LIMIT): boolean {
  for (const [key, value] of rateEntries) if (now - value.startedAt > RATE_WINDOW_MS) rateEntries.delete(key)
  const current = rateEntries.get(principalId)
  if (!current || now - current.startedAt > RATE_WINDOW_MS) {
    if (rateEntries.size >= RATE_ENTRY_LIMIT) rateEntries.delete(rateEntries.keys().next().value as string)
    rateEntries.set(principalId, { count: 1, startedAt: now }); return true
  }
  if (current.count >= limit) return false
  current.count += 1
  return true
}
