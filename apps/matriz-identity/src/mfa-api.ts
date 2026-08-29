import type { IncomingMessage, ServerResponse } from "node:http"
import { consumeRecoveryCode, createTotpEnrollment, decryptTotpSecret, encryptTotpSecret, verifyAndConsumeTotp, type RecoveryCodeRepository } from "./mfa.js"
import type { RateLimitStore } from "./rate-limit.js"

type MfaIdentity = Readonly<{ userId: string; clientId: string; sessionId: string; authTime?: number; acr?: string; amr?: readonly string[] }>
export interface MfaRuntimeRepository extends RecoveryCodeRepository {
  requiresMfa(userId: string): Promise<boolean>
  createTotp(input: { userId: string; secretCiphertext: string }): Promise<{ id: string }>
  findTotp(input: { methodId: string; userId: string; verifiedOnly: boolean }): Promise<{ id: string; userId: string; secretCiphertext: string; verifiedAt: Date | null } | null>
  advanceCounter(methodId: string, counter: number): Promise<boolean>
  markVerified(methodId: string, verifiedAt: Date): Promise<void>
  audit(event: { actorUserId: string; eventType: "MFA_ENROLLED" | "MFA_VERIFIED" | "MFA_RECOVERY_USED"; subjectId: string }): Promise<void>
}

export function createMfaApiHandler(input: { encryptionKey: string; now?: () => number; rateLimits: RateLimitStore; tokens: { verify(token: string): Promise<MfaIdentity | null>; issueStepUp?(identity: MfaIdentity): Promise<{ accessToken: string }> }; repository: MfaRuntimeRepository }) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const path = request.url?.split("?", 1)[0]
    if (!path?.startsWith("/api/mfa/")) return false
    response.setHeader("Cache-Control", "no-store, private")
    if (request.method !== "POST") return json(response, 405, { error: "method_not_allowed" })
    const bearer = /^Bearer (\S+)$/i.exec(String(request.headers.authorization ?? ""))?.[1]
    const identity = bearer ? await input.tokens.verify(bearer) : null
    if (!identity) return json(response, 401, { error: "invalid_token" })
    const now = input.now?.() ?? Math.floor(Date.now() / 1000)
    if (!hasRecentVerifiedAuthentication(identity, now)) return json(response, 403, { error: "recent_authentication_required" })
    if (!await input.rateLimits.consume({ key: `mfa\0${identity.clientId}\0${identity.userId}\0${path}`, limit: 10, windowMs: 60_000 })) return json(response, 429, { error: "rate_limited" })
    const body = await readJson(request)

    if (path === "/api/mfa/enroll") {
      const enrollment = createTotpEnrollment(identity.userId)
      const created = await input.repository.createTotp({ userId: identity.userId, secretCiphertext: encryptTotpSecret(enrollment.method.secretCiphertext, input.encryptionKey) })
      return json(response, 201, { methodId: created.id, otpauthUri: enrollment.otpauthUri })
    }
    if (path === "/api/mfa/verify" || path === "/api/mfa/challenge") {
      if (typeof body.methodId !== "string" || typeof body.code !== "string") return json(response, 400, { error: "invalid_request" })
      const method = await input.repository.findTotp({ methodId: body.methodId, userId: identity.userId, verifiedOnly: path.endsWith("challenge") })
      if (!method) return json(response, 401, { error: "mfa_failed" })
      const accepted = await verifyAndConsumeTotp(input.repository, { methodId: method.id, secret: decryptTotpSecret(method.secretCiphertext, input.encryptionKey), code: body.code })
      if (!accepted) return json(response, 401, { error: "mfa_failed" })
      if (!method.verifiedAt) {
        await input.repository.markVerified(method.id, new Date())
        await input.repository.audit({ actorUserId: identity.userId, eventType: "MFA_ENROLLED", subjectId: method.id })
      }
      await input.repository.audit({ actorUserId: identity.userId, eventType: "MFA_VERIFIED", subjectId: method.id })
      const tokens = await input.tokens.issueStepUp?.(identity)
      return json(response, 200, { verified: true, amr: ["otp"], acr: "urn:matriz:loa:2", sessionId: identity.sessionId, ...(tokens ? { tokens } : {}) })
    }
    if (path === "/api/mfa/recovery") {
      if (typeof body.code !== "string") return json(response, 400, { error: "invalid_request" })
      if (!await consumeRecoveryCode(input.repository, { userId: identity.userId, code: body.code })) return json(response, 401, { error: "mfa_failed" })
      const tokens = await input.tokens.issueStepUp?.(identity)
      return json(response, 200, { verified: true, amr: ["otp"], acr: "urn:matriz:loa:2", sessionId: identity.sessionId, ...(tokens ? { tokens } : {}) })
    }
    return json(response, 404, { error: "not_found" })
  }
}

function hasRecentVerifiedAuthentication(identity: MfaIdentity, now: number): boolean {
  if (!identity.authTime || identity.authTime > now + 60 || now - identity.authTime > 900) return false
  if (identity.acr !== "urn:matriz:loa:1" && identity.acr !== "urn:matriz:loa:2") return false
  const methods = identity.amr ?? []
  return methods.includes("pwd") || (identity.acr === "urn:matriz:loa:2" && methods.some((method) => method === "otp" || method === "hwk"))
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0; const chunks: Buffer[] = []
  for await (const chunk of request) { const value = Buffer.from(chunk); size += value.length; if (size > 8 * 1024) throw new Error("body too large"); chunks.push(value) }
  try { const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {} } catch { return {} }
}
function json(response: ServerResponse, status: number, body: unknown): true { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(body)); return true }
