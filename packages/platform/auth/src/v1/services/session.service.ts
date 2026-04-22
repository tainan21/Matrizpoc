/**
 * Pure session lifecycle helpers. No React. These functions produce and
 * validate `AuthSession` values; the provider wraps them with state
 * transitions.
 */
import type { AuthIdentity, AuthSession, AuthResult } from "../types"
import { authErr, authOk } from "../types"
import type { SessionSnapshot } from "../contracts"
import { authSessionSchema } from "../schemas"
import {
  toSessionSnapshot,
  fromSessionSnapshot,
} from "../mappers/session-snapshot.mapper"
import type { SessionStorage } from "../storage/session.storage"

export interface CreateSessionParams {
  readonly identity: AuthIdentity
  readonly strategyId: string
  readonly sessionTtlMs: number
  readonly now: Date
  readonly preferredTenantId?: string
}

export function createSession(params: CreateSessionParams): AuthSession {
  const issuedAt = params.now.toISOString()
  const expiresAt = new Date(
    params.now.getTime() + params.sessionTtlMs,
  ).toISOString()
  const tenant =
    (params.preferredTenantId
      ? params.identity.tenants.find((t) => t.tenantId === params.preferredTenantId)
      : undefined) ?? params.identity.tenants[0]!
  return {
    identity: params.identity,
    activeTenantId: tenant.tenantId,
    issuedAt,
    expiresAt,
    strategyId: params.strategyId,
  }
}

export function persistSession(
  storage: SessionStorage,
  session: AuthSession,
): void {
  storage.save(toSessionSnapshot(session))
}

export function clearSession(storage: SessionStorage): void {
  storage.clear()
}

/**
 * Attempts to restore a session from storage. Returns an error result if
 * the snapshot is missing, malformed, or expired.
 */
export function restoreSession(
  storage: SessionStorage,
  now: Date,
): AuthResult<AuthSession> {
  const snap: SessionSnapshot | undefined = storage.load()
  if (!snap) {
    return authErr({
      code: "session-not-found",
      message: "Nenhuma sessao salva.",
    })
  }
  const session = fromSessionSnapshot(snap)
  const parsed = authSessionSchema.safeParse(session)
  if (!parsed.success) {
    storage.clear()
    return authErr({
      code: "storage-unavailable",
      message: "Sessao salva invalida.",
      cause: parsed.error.issues,
    })
  }
  if (now.getTime() >= new Date(session.expiresAt).getTime()) {
    storage.clear()
    return authErr({
      code: "session-expired",
      message: "Sua sessao expirou.",
    })
  }
  return authOk(session)
}

/**
 * Extends the session expiry window. Used by the provider's `refresh`.
 * Does not rotate identity — only stamps a new expiresAt.
 */
export function refreshSession(
  session: AuthSession,
  now: Date,
  sessionTtlMs: number,
): AuthSession {
  return {
    ...session,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + sessionTtlMs).toISOString(),
  }
}
