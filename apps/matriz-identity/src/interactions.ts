import { createHmac, timingSafeEqual } from "node:crypto"
import { isIP } from "node:net"
import type { IncomingMessage, ServerResponse } from "node:http"
import type Provider from "oidc-provider"
import type { RateLimitStore } from "./rate-limit.js"

export interface IdentityAuthenticator {
  authenticate(input: { login: string; credential: string }): Promise<{ accountId: string; mfaRequired?: boolean; amr?: readonly string[] } | null>
}

const MAX_BODY = 8 * 1024

export function createInteractionHandler(input: {
  provider: Provider
  authenticator: IdentityAuthenticator
  issuer: string
  csrfSecret: string
  rateLimits: RateLimitStore
  mfaPolicy?: { requiresMfa(userId: string): Promise<boolean> }
  mfaChallenge?: { verifyTotp(userId: string, code: string): Promise<boolean>; verifyRecovery(userId: string, code: string): Promise<boolean> }
  trustProxy?: boolean
  trustedProxyHops?: number
}) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    if (!request.url?.startsWith("/interaction/")) return false
    setSecureHeaders(response)
    const details = await input.provider.interactionDetails(request, response)
    const uid = String(details.uid)
    if (request.method === "GET") {
      const csrf = csrfToken(uid, input.csrfSecret)
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" })
      response.end(render(details.prompt.name, uid, csrf))
      return true
    }
    if (request.method !== "POST") return methodNotAllowed(response)
    if (!sameOrigin(request, input.issuer)) return reject(response, 403, "invalid origin")
    const body = await readBody(request)
    const clientId = String(details.params?.client_id ?? "unknown")
    const login = (body.get("login") ?? "").trim().toLowerCase()
    const ip = requestIp(request, input.trustProxy === true, input.trustedProxyHops ?? 0)
    const buckets = [
      input.rateLimits.consume({ key: `ip\0${clientId}\0${ip}`, limit: 50, windowMs: 60_000 }),
      input.rateLimits.consume({ key: `client\0${clientId}`, limit: 500, windowMs: 60_000 }),
    ]
    if (details.prompt.name === "login") buckets.push(input.rateLimits.consume({ key: `account\0${clientId}\0${login}`, limit: 10, windowMs: 60_000 }))
    else if (details.prompt.name === "consent") buckets.push(input.rateLimits.consume({ key: `consent\0${clientId}\0${details.session?.accountId ?? "unknown"}`, limit: 30, windowMs: 60_000 }))
    const allowed = await Promise.all(buckets)
    if (allowed.includes(false)) return reject(response, 429, "too many attempts")
    if (!safeEqual(body.get("csrf") ?? "", csrfToken(uid, input.csrfSecret))) return reject(response, 403, "invalid csrf")

    if (details.prompt.name === "login") {
      const pending = verifyMfaState(body.get("mfa_state"), input.csrfSecret, uid, clientId)
      if (pending) {
        const code = body.get("code") ?? ""
        const accepted = body.get("proof") === "recovery"
          ? await input.mfaChallenge?.verifyRecovery(pending.accountId, code)
          : await input.mfaChallenge?.verifyTotp(pending.accountId, code)
        if (!accepted) return reject(response, 401, "mfa proof failed")
        await input.provider.interactionFinished(request, response, { login: { accountId: pending.accountId, acr: "urn:matriz:loa:2", amr: ["pwd", "otp"] } }, { mergeWithLastSubmission: false })
        return true
      }
      const result = await input.authenticator.authenticate({ login: body.get("login") ?? "", credential: body.get("credential") ?? "" })
      if (!result) return reject(response, 401, "authentication failed")
      const mfaRequired = result.mfaRequired || await input.mfaPolicy?.requiresMfa(result.accountId) === true
      if (mfaRequired && !result.amr?.some((method) => method === "otp" || method === "hwk")) {
        if (!input.mfaChallenge) return reject(response, 403, "mfa step-up unavailable")
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" })
        response.end(renderMfa(uid, csrfToken(uid, input.csrfSecret), signMfaState({ uid, clientId, accountId: result.accountId, exp: Date.now() + 5 * 60_000 }, input.csrfSecret)))
        return true
      }
      await input.provider.interactionFinished(request, response, { login: { accountId: result.accountId, ...(result.amr ? { amr: [...result.amr] } : {}) } }, { mergeWithLastSubmission: false })
      return true
    }
    if (details.prompt.name === "consent") {
      const grant = new input.provider.Grant({ accountId: details.session.accountId, clientId: details.params.client_id })
      if (details.prompt.details.missingOIDCScope) grant.addOIDCScope(details.prompt.details.missingOIDCScope.join(" "))
      if (details.prompt.details.missingOIDCClaims) grant.addOIDCClaims(details.prompt.details.missingOIDCClaims)
      for (const [indicator, scopes] of Object.entries(details.prompt.details.missingResourceScopes ?? {})) grant.addResourceScope(indicator, (scopes as string[]).join(" "))
      await input.provider.interactionFinished(request, response, { consent: { grantId: await grant.save() } }, { mergeWithLastSubmission: true })
      return true
    }
    return reject(response, 400, "unsupported interaction")
  }
}

function render(prompt: string, uid: string, csrf: string): string {
  const fields = prompt === "login" ? '<label>Login<input name="login" required maxlength="254"></label><label>Credential<input name="credential" type="password" required maxlength="1024"></label>' : '<p>Authorize this application?</p>'
  return `<!doctype html><html><body><main><h1>${prompt === "login" ? "Sign in" : "Consent"}</h1><form method="post" action="/interaction/${escapeHtml(uid)}"><input type="hidden" name="csrf" value="${csrf}">${fields}<button type="submit">Continue</button></form></main></body></html>`
}
function renderMfa(uid: string, csrf: string, state: string) { return `<!doctype html><html><body><main><h1>Verify sign in</h1><form method="post" action="/interaction/${escapeHtml(uid)}"><input type="hidden" name="csrf" value="${csrf}"><input type="hidden" name="mfa_state" value="${state}"><label>Code<input name="code" required autocomplete="one-time-code"></label><label><input type="radio" name="proof" value="totp" checked>TOTP</label><label><input type="radio" name="proof" value="recovery">Recovery code</label><button type="submit">Verify</button></form></main></body></html>` }
type MfaState = { uid: string; clientId: string; accountId: string; exp: number }
function signMfaState(state: MfaState, secret: string) { const payload = Buffer.from(JSON.stringify(state)).toString("base64url"); return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}` }
function verifyMfaState(value: string | null, secret: string, uid: string, clientId: string): MfaState | null { if (!value) return null; const [payload, signature] = value.split("."); if (!payload || !signature || !safeEqual(signature, createHmac("sha256", secret).update(payload).digest("base64url"))) return null; try { const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as MfaState; return state.uid === uid && state.clientId === clientId && state.exp > Date.now() ? state : null } catch { return null } }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!) }
function csrfToken(uid: string, secret: string) { return createHmac("sha256", secret).update(uid).digest("base64url") }
function safeEqual(a: string, b: string) { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y) }
function sameOrigin(request: IncomingMessage, issuer: string) { try { return new URL(String(request.headers.origin)).origin === new URL(issuer).origin } catch { return false } }
export function requestIp(request: IncomingMessage, trustProxy: boolean, trustedProxyHops: number) {
  if (!trustProxy) return request.socket.remoteAddress ?? "unknown"
  const forwarded = String(request.headers["x-forwarded-for"] ?? "").split(",").map((value) => value.trim()).filter(Boolean)
  const candidate = forwarded[forwarded.length - trustedProxyHops]
  return candidate && isIP(candidate) ? candidate : request.socket.remoteAddress ?? "unknown"
}
async function readBody(request: IncomingMessage) { let size = 0; const chunks: Buffer[] = []; for await (const chunk of request) { const buffer = Buffer.from(chunk); size += buffer.length; if (size > MAX_BODY) throw new Error("body too large"); chunks.push(buffer) } return new URLSearchParams(Buffer.concat(chunks).toString("utf8")) }
function setSecureHeaders(response: ServerResponse) { response.setHeader("Cache-Control", "no-store, private"); response.setHeader("Content-Security-Policy", "default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"); response.setHeader("X-Content-Type-Options", "nosniff") }
function reject(response: ServerResponse, status: number, message: string) { response.writeHead(status, { "content-type": "text/plain; charset=utf-8" }); response.end(message); return true }
function methodNotAllowed(response: ServerResponse) { response.setHeader("Allow", "GET, POST"); return reject(response, 405, "method not allowed") }
