import { afterEach, describe, expect, it, vi } from "vitest"
import { createOidcSessionRoute, createOidcTenantSwitchRoute, establishOidcServerSession, OIDC_SESSION_COOKIE, resolveOidcServerSession, resolveOidcServerSessionDurable } from "@matriz/platform-auth/server"
import { getHubRequestContext } from "../../apps/matriz-hub/src/auth/hub-session"

describe("Hub protected OIDC context", () => {
  afterEach(() => vi.unstubAllGlobals())
  it("authorizes a protected request from the opaque OIDC session and exposes server context", () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString()
    const session = { identity: { user: { id: "user-1", name: "Ana", email: "ana@example.test" }, tenants: [{ tenantId: "tenant-a", tenantName: "A", roles: ["owner"], enabledApps: ["matriz-hub"] }] }, activeTenantId: "tenant-a", strategyId: "oidc", issuedAt: new Date().toISOString(), expiresAt }
    const context = { userId: "user-1", tenantId: "tenant-a", appId: "matriz-hub", membershipId: "membership-a", tenantRoles: ["owner"], appRoles: ["operator"], capabilities: ["hub.catalog.read"], sessionId: "sid-1" }
    const opaqueId = establishOidcServerSession({ session: session as never, context, accessToken: "opaque-access", accessExpiresAt: Date.now() + 60_000, idToken: "opaque-id", switchCsrfToken: "csrf" })
    const resolved = getHubRequestContext(new Request("https://hub.example.test/api/registry", { headers: { cookie: `${OIDC_SESSION_COOKIE}=${opaqueId}` } }))
    expect(resolved.authorizationContext).toMatchObject({ tenantId: "tenant-a", appId: "matriz-hub", membershipId: "membership-a" })
    expect(opaqueId.length).toBeLessThan(100)
  })

  it("rejects a sibling app session", () => {
    const session = { identity: { user: { id: "u", name: "U", email: "u@x.test" }, tenants: [] }, activeTenantId: "tenant-a", strategyId: "oidc", issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() }
    const opaqueId = establishOidcServerSession({ session: session as never, context: { userId: "u", tenantId: "tenant-a", appId: "spot", membershipId: "m", tenantRoles: [], appRoles: [], capabilities: [], sessionId: "s" }, accessToken: "a", accessExpiresAt: Date.now() + 60_000, idToken: "i", switchCsrfToken: "c" })
    expect(() => getHubRequestContext(new Request("https://hub.example.test", { headers: { cookie: `${OIDC_SESSION_COOKIE}=${opaqueId}` } }))).toThrow("Access denied")
  })

  it("rotates the opaque session only after Identity returns a new authorized token", async () => {
    const session = { identity: { user: { id: "u", name: "U", email: "u@x.test" }, tenants: [] }, activeTenantId: "tenant-a", strategyId: "oidc", issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() }
    const base = { userId: "u", appId: "matriz-hub", membershipId: "m", tenantRoles: [], appRoles: [], capabilities: [], sessionId: "s" }
    const oldId = establishOidcServerSession({ session: session as never, context: { ...base, tenantId: "tenant-a" }, accessToken: "old", accessExpiresAt: Date.now() + 60_000, idToken: "i", switchCsrfToken: "csrf" })
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ context: { ...base, tenantId: "tenant-b" }, switchCsrfToken: "next", tokens: { accessToken: "new" } })))
    const route = createOidcTenantSwitchRoute({ issuer: "https://identity.example.test", clientId: "hub", clientSecret: "x".repeat(32), appId: "matriz-hub", callbackUrl: "https://hub.example.test/api/auth/oidc/callback", sessionSecret: "y".repeat(32) })
    const response = await route(new Request("https://hub.example.test/api/auth/oidc/tenant", { method: "POST", headers: { origin: "https://hub.example.test", cookie: `${OIDC_SESSION_COOKIE}=${oldId}`, "content-type": "application/json" }, body: JSON.stringify({ tenantId: "tenant-b" }) }))
    expect(response.status).toBe(200)
    const nextId = response.headers.get("set-cookie")!.match(/__Host-matriz_session=([^;]+)/)![1]
    expect(resolveOidcServerSession(new Request("https://hub.example.test", { headers: { cookie: `${OIDC_SESSION_COOKIE}=${oldId}` } }))).toBeNull()
    expect(resolveOidcServerSession(new Request("https://hub.example.test", { headers: { cookie: `${OIDC_SESSION_COOKIE}=${nextId}` } }))?.context.tenantId).toBe("tenant-b")
  })

  it("rotates refresh tokens and rejects a revoked refresh family", async () => {
    const session = { identity: { user: { id: "u", name: "U", email: "u@x.test" }, tenants: [] }, activeTenantId: "tenant-a", strategyId: "oidc", issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() }
    const context = { userId: "u", tenantId: "tenant-a", appId: "matriz-hub", membershipId: "m", tenantRoles: [], appRoles: [], capabilities: [], sessionId: "s" }
    const id = establishOidcServerSession({ session: session as never, context, accessToken: "expired", accessExpiresAt: 0, refreshToken: "refresh-1", idToken: "i", switchCsrfToken: "csrf" })
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes("well-known")) return Response.json({ issuer: "https://identity.example.test", token_endpoint: "https://identity.example.test/token", jwks_uri: "https://identity.example.test/jwks" })
      if (url.endsWith("/token")) return Response.json({ access_token: "fresh", refresh_token: "refresh-2", expires_in: 300 })
      return Response.json({ context, switchCsrfToken: "csrf-2", eligibleTenants: [] })
    }); vi.stubGlobal("fetch", fetchMock)
    const route = createOidcSessionRoute({ issuer: "https://identity.example.test", clientId: "hub", clientSecret: "x".repeat(32), appId: "matriz-hub", callbackUrl: "https://hub.example.test/api/auth/oidc/callback", sessionSecret: "y".repeat(32) })
    expect((await route(new Request("https://hub.example.test/api/auth/oidc/session", { headers: { cookie: `${OIDC_SESSION_COOKIE}=${id}` } }))).status).toBe(200)
    expect(fetchMock.mock.calls.some(([, init]) => String(init?.body).includes("refresh-1"))).toBe(true)
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => String(input).includes("well-known") ? Response.json({ issuer: "https://identity.example.test", token_endpoint: "https://identity.example.test/token", jwks_uri: "x" }) : new Response(null, { status: 401 })))
    const revokedId = establishOidcServerSession({ session: session as never, context, accessToken: "expired", accessExpiresAt: 0, refreshToken: "revoked", idToken: "i", switchCsrfToken: "csrf" })
    expect((await route(new Request("https://hub.example.test/api/auth/oidc/session", { headers: { cookie: `${OIDC_SESSION_COOKIE}=${revokedId}` } }))).status).toBe(401)
  })

  it("uses a refresh token only once across concurrent protected requests", async () => {
    const session = { identity: { user: { id: "u", name: "U", email: "u@x.test" }, tenants: [] }, activeTenantId: "tenant-a", strategyId: "oidc", issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() }
    const context = { userId: "u", tenantId: "tenant-a", appId: "matriz-hub", membershipId: "m", tenantRoles: [], appRoles: [], capabilities: [], sessionId: "s" }
    const id = establishOidcServerSession({ session: session as never, context, accessToken: "expired", accessExpiresAt: 0, refreshToken: "single-use", idToken: "i", switchCsrfToken: "csrf" })
    let refreshCalls = 0
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes("well-known")) return Response.json({ issuer: "https://identity.example.test", token_endpoint: "https://identity.example.test/token", jwks_uri: "x" })
      if (url.endsWith("/token")) { refreshCalls++; await new Promise(resolve => setTimeout(resolve, 30)); return Response.json({ access_token: "fresh", refresh_token: "next", expires_in: 300 }) }
      return Response.json({ context, switchCsrfToken: "csrf", eligibleTenants: [] })
    }))
    const config = { issuer: "https://identity.example.test", clientId: "hub", clientSecret: "x".repeat(32), appId: "matriz-hub", callbackUrl: "https://hub.example.test/api/auth/oidc/callback", sessionSecret: "y".repeat(32) }
    const request = () => new Request("https://hub.example.test/api/protected", { headers: { cookie: `${OIDC_SESSION_COOKIE}=${id}` } })
    const [first, second] = await Promise.all([resolveOidcServerSessionDurable(request(), config), resolveOidcServerSessionDurable(request(), config)])
    expect(first?.context.tenantId).toBe("tenant-a")
    expect(second?.context.tenantId).toBe("tenant-a")
    expect(refreshCalls).toBe(1)
  })
})
