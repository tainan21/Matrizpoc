/**
 * Real server-side session lifecycle — persists in core.app_sessions.
 *
 * Apps (Hub, Seumei, Contracts, ...) call these from Next.js route handlers.
 * The raw cookie token NEVER hits the DB; only its sha256 hash does.
 */
import { randomBytes } from "node:crypto"
import { getCoreDb } from "@matriz/platform-db/core"
import { makeAppSessionRepo } from "@matriz/platform-db/core/repositories"
import type { AuthIdentity, AuthSession } from "../types"

const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export type IssueSessionInput = {
  readonly identity: AuthIdentity
  readonly tenantId: string
  readonly appId: string
  readonly strategyId: string
  readonly ttlMs?: number
  readonly ip?: string | null
  readonly userAgent?: string | null
}

export type IssuedSession = {
  readonly session: AuthSession
  /** Raw cookie token. Store in HTTP-only cookie; never log. */
  readonly rawToken: string
}

/**
 * Creates a new AppSession row and returns the AuthSession DTO + raw cookie
 * token. The caller is responsible for setting the HTTP-only cookie.
 */
export async function issueSession(
  input: IssueSessionInput,
): Promise<IssuedSession> {
  const ttlMs = input.ttlMs ?? DEFAULT_SESSION_TTL_MS
  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt.getTime() + ttlMs)
  const rawToken = randomBytes(32).toString("base64url")

  // Derive userId from identity (domain DTO holds branded string).
  const userId = input.identity.user.id as unknown as string

  const repo = makeAppSessionRepo(getCoreDb())
  await repo.create({
    userId,
    tenantId: input.tenantId,
    appId: input.appId,
    strategyId: input.strategyId,
    rawToken,
    issuedAt,
    expiresAt,
    ipHash: hashIpMaybe(input.ip),
    userAgent: input.userAgent ?? null,
  })

  const session: AuthSession = {
    identity: input.identity,
    activeTenantId: input.identity.tenants.find(
      (t) => (t.tenantId as unknown as string) === input.tenantId,
    )?.tenantId ??
      input.identity.tenants[0]?.tenantId ??
      (input.tenantId as never),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    strategyId: input.strategyId,
  }

  return { session, rawToken }
}

/**
 * Resolves an AppSession row by its raw cookie token. Returns null if the
 * session is missing, revoked, or expired. Also rehydrates the owning User.
 */
export async function readSessionByToken(rawToken: string) {
  const repo = makeAppSessionRepo(getCoreDb())
  return repo.findActiveByToken(rawToken)
}

/** Revokes a single session by its raw cookie token. */
export async function revokeSessionByToken(rawToken: string) {
  const repo = makeAppSessionRepo(getCoreDb())
  return repo.revokeByToken(rawToken)
}

function hashIpMaybe(ip: string | null | undefined): string | null {
  if (!ip) return null
  // Small, cheap non-crypto hash (keeps auth isolated from crypto import here).
  let h = 0
  for (let i = 0; i < ip.length; i++) h = (h * 31 + ip.charCodeAt(i)) | 0
  return Math.abs(h).toString(16)
}
