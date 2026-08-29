import { createHmac, timingSafeEqual } from "node:crypto"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { RateLimitStore } from "./rate-limit.js"
import { requiresStepUp } from "./mfa.js"

export type VerifiedAccessToken = Readonly<{ userId: string; clientId: string; sessionId: string; authTime?: number; acr?: string; amr?: readonly string[] }>
export type EligibleTenant = Readonly<{ tenantId: string; tenantName: string; membershipId: string; tenantRoles: readonly string[]; appRoles: readonly string[]; capabilities: readonly string[] }>
export interface AccessApiRepository {
  findClientAppId(clientId: string): Promise<string | null>
  findEligibleTenants(input: { userId: string; appId: string }): Promise<readonly EligibleTenant[]>
  audit(event: { tenantId: string; actorUserId: string; eventType: "TENANT_SWITCHED"; subjectId: string; metadata: { appId: string; sessionId: string } }): Promise<void>
}

export function createAccessCsrfToken(sessionId: string, secret: string): string {
  return createHmac("sha256", secret).update(`tenant-switch\0${sessionId}`).digest("base64url")
}

export function createAccessApiHandler(input: { issuer: string; csrfSecret: string; now?: () => number; rateLimits: RateLimitStore; tokens: { verify(token: string): Promise<VerifiedAccessToken | null>; issue?(claims: Record<string, unknown>): Promise<{ accessToken: string; idToken?: string }> }; access: AccessApiRepository }) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const path = request.url?.split("?", 1)[0]
    if (path !== "/api/access/exchange" && path !== "/api/access/switch") return false
    response.setHeader("Cache-Control", "no-store, private")
    if (request.method !== "POST") return json(response, 405, { error: "method_not_allowed" })
    const bearer = /^Bearer (\S+)$/i.exec(String(request.headers.authorization ?? ""))?.[1]
    const identity = bearer ? await input.tokens.verify(bearer) : null
    if (!identity) return json(response, 401, { error: "invalid_token" })
    if (!await input.rateLimits.consume({ key: `access\0${identity.clientId}\0${identity.userId}`, limit: 30, windowMs: 60_000 })) return json(response, 429, { error: "rate_limited" })
    if (path === "/api/access/switch") {
      if (!sameOrigin(request, input.issuer) || !safeEqual(String(request.headers["x-csrf-token"] ?? ""), createAccessCsrfToken(identity.sessionId, input.csrfSecret))) return json(response, 403, { error: "request_rejected" })
      if (requiresStepUp({ required: true, amr: identity.amr ?? [], authTime: identity.authTime ?? 0, acr: identity.acr }, input.now?.() ?? Math.floor(Date.now() / 1000))) return json(response, 403, { error: "mfa_step_up_required" })
    }
    const body = await readJson(request)
    const appId = await input.access.findClientAppId(identity.clientId)
    if (!appId) return json(response, 403, { error: "client_not_authorized" })
    const eligibleTenants = await input.access.findEligibleTenants({ userId: identity.userId, appId })
    const selected = eligibleTenants.find((tenant) => tenant.tenantId === body.tenantId) ?? (!body.tenantId ? eligibleTenants[0] : undefined)
    if (!selected) return json(response, 403, { error: "tenant_not_authorized" })
    const claims = { tenant_id: selected.tenantId, membership_id: selected.membershipId, tenant_roles: selected.tenantRoles, app_id: appId, app_roles: selected.appRoles, capabilities: selected.capabilities, auth_time: identity.authTime, acr: identity.acr, amr: identity.amr ?? [], sid: identity.sessionId }
    let tokens: { accessToken: string; idToken?: string } | undefined
    if (path === "/api/access/switch") {
      if (!input.tokens.issue) return json(response, 501, { error: "token_reissue_unavailable" })
      tokens = await input.tokens.issue({ sub: identity.userId, client_id: identity.clientId, ...claims })
      await input.access.audit({ tenantId: selected.tenantId, actorUserId: identity.userId, eventType: "TENANT_SWITCHED", subjectId: identity.sessionId, metadata: { appId, sessionId: identity.sessionId } })
    }
    return json(response, 200, {
      user: { id: identity.userId },
      context: { userId: identity.userId, tenantId: selected.tenantId, appId, membershipId: selected.membershipId, tenantRoles: selected.tenantRoles, appRoles: selected.appRoles, capabilities: selected.capabilities, sessionId: identity.sessionId },
      eligibleTenants,
      claims,
      ...(tokens ? { tokens } : {}),
      switchCsrfToken: createAccessCsrfToken(identity.sessionId, input.csrfSecret),
    })
  }
}

async function readJson(request: IncomingMessage): Promise<{ tenantId?: string }> {
  let size = 0; const chunks: Buffer[] = []
  for await (const chunk of request) { const value = Buffer.from(chunk); size += value.length; if (size > 8 * 1024) throw new Error("body too large"); chunks.push(value) }
  try { const value = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record<string, unknown>; return typeof value.tenantId === "string" ? { tenantId: value.tenantId } : {} } catch { return {} }
}
function sameOrigin(request: IncomingMessage, issuer: string) { try { return new URL(String(request.headers.origin)).origin === new URL(issuer).origin } catch { return false } }
function safeEqual(a: string, b: string) { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y) }
function json(response: ServerResponse, status: number, body: unknown): true { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(body)); return true }
