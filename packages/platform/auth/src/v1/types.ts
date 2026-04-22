/**
 * @matriz/platform-auth — V1 contract types.
 *
 * L12: no app-specific domain. Only identity + session primitives.
 * L7: types live under `v1/` so a future v2 can co-exist.
 */
import type { AppId, TenantId, UserId } from "@matriz/foundation-types"

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/**
 * Minimal user projection visible to apps after sign-in. Apps must never
 * persist richer business data here — that belongs to each app's domain.
 */
export interface AuthUser {
  readonly id: UserId
  readonly name: string
  readonly email: string
}

/**
 * One tenant the authenticated user can act on. Roles are kept as opaque
 * strings; each app is free to interpret them locally via its own
 * `access-permissions` adapter (L12 keeps auth domain-free).
 */
export interface AuthTenantAccess {
  readonly tenantId: TenantId
  readonly tenantName: string
  readonly roles: readonly string[]
  /** Apps visible to the user inside this tenant. Empty = no app access. */
  readonly enabledApps: readonly AppId[]
}

/**
 * Identity = user + the set of tenants they can act on. This is the data
 * returned by a successful sign-in. Apps compose this with
 * `@matriz/access-tenants` to resolve the *active* tenant.
 */
export interface AuthIdentity {
  readonly user: AuthUser
  readonly tenants: readonly AuthTenantAccess[]
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/**
 * Sign-in result. The session is the unit apps read; `activeTenantId` is
 * always one of `identity.tenants[*].tenantId`.
 */
export interface AuthSession {
  readonly identity: AuthIdentity
  readonly activeTenantId: TenantId
  readonly issuedAt: string
  readonly expiresAt: string
  /** Which strategy produced this session ("otp" | "magic-link" | ...). */
  readonly strategyId: string
}

// ---------------------------------------------------------------------------
// Status machine
// ---------------------------------------------------------------------------

/**
 * Finite auth status. UIs branch on this, never on raw session presence.
 *
 * - `booting` — provider mounted, still restoring from storage
 * - `signed-out` — no session (fresh or after signOut)
 * - `signed-in` — valid session
 * - `signing-in` — strategy started (OTP sent, magic link requested)
 * - `refreshing` — refreshing session in background
 * - `error` — last transition failed; see `error`
 */
export type AuthStatus =
  | "booting"
  | "signed-out"
  | "signing-in"
  | "signed-in"
  | "refreshing"
  | "error"

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type AuthErrorCode =
  | "invalid-input"
  | "invalid-credentials"
  | "session-expired"
  | "session-not-found"
  | "strategy-unavailable"
  | "storage-unavailable"
  | "unknown"

export interface AuthError {
  readonly code: AuthErrorCode
  readonly message: string
  readonly cause?: unknown
}

export const authError = (
  code: AuthErrorCode,
  message: string,
  cause?: unknown,
): AuthError => ({ code, message, cause })

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export type AuthResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: AuthError }

export const authOk = <T>(value: T): AuthResult<T> => ({ ok: true, value })
export const authErr = <T = never>(error: AuthError): AuthResult<T> => ({
  ok: false,
  error,
})
