/**
 * @matriz/platform-auth
 *
 * Shared mock auth flows and contracts for the POC. No real backend.
 * Exposes a typed mock user + session helper. React hooks are NOT in this
 * package (they're a UI/runtime concern); apps wire their own providers
 * around `MOCK_SESSION`.
 *
 * L12: no app-specific logic.
 */
import { asTenantId, asUserId, type TenantId, type UserId } from "@matriz/foundation-types"
import { MATRIZ_MOCK_TENANT_IDS } from "@matriz/foundation-constants"
import { userIdSchema, tenantIdSchema, z } from "@matriz/foundation-schemas"

export const PLATFORM_AUTH_VERSION = "0.1.0" as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  readonly id: UserId
  readonly name: string
  readonly email: string
  readonly tenantIds: readonly TenantId[]
}

export interface AuthSession {
  readonly user: AuthUser
  readonly activeTenantId: TenantId
  readonly issuedAt: string
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const authUserSchema = z.object({
  id: userIdSchema,
  name: z.string().min(1),
  email: z.string().email(),
  tenantIds: z.array(tenantIdSchema).min(1),
})

export const authSessionSchema = z.object({
  user: authUserSchema,
  activeTenantId: tenantIdSchema,
  issuedAt: z.string(),
})

// ---------------------------------------------------------------------------
// Mock seed — single demo user across all tenants
// ---------------------------------------------------------------------------

export const MOCK_USER: AuthUser = {
  id: asUserId("user_demo_001"),
  name: "Ana Demo",
  email: "ana@matriz.demo",
  tenantIds: MATRIZ_MOCK_TENANT_IDS.map((t) => asTenantId(t)),
}

export function createMockSession(tenantIdRaw?: string): AuthSession {
  const fallback = MOCK_USER.tenantIds[0]!
  const tenantId = tenantIdRaw ? asTenantId(tenantIdRaw) : fallback
  return {
    user: MOCK_USER,
    activeTenantId: tenantId,
    issuedAt: new Date().toISOString(),
  }
}
