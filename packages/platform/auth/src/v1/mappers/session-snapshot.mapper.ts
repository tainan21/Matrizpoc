/**
 * Maps between the runtime `AuthSession` (branded types) and the
 * persisted `SessionSnapshot` (plain strings). Separation keeps the
 * storage format stable even if branded types evolve.
 */
import { asAppId, asTenantId, asUserId } from "@matriz/foundation-types"
import type { AuthSession } from "../types"
import type { SessionSnapshot } from "../contracts"

export function toSessionSnapshot(session: AuthSession): SessionSnapshot {
  return {
    v: 1,
    activeTenantId: session.activeTenantId,
    strategyId: session.strategyId,
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
    identity: {
      user: {
        id: session.identity.user.id,
        name: session.identity.user.name,
        email: session.identity.user.email,
      },
      tenants: session.identity.tenants.map((t) => ({
        tenantId: t.tenantId,
        tenantName: t.tenantName,
        roles: t.roles,
        enabledApps: t.enabledApps,
      })),
    },
  }
}

export function fromSessionSnapshot(snap: SessionSnapshot): AuthSession {
  return {
    activeTenantId: asTenantId(snap.activeTenantId),
    strategyId: snap.strategyId,
    issuedAt: snap.issuedAt,
    expiresAt: snap.expiresAt,
    identity: {
      user: {
        id: asUserId(snap.identity.user.id),
        name: snap.identity.user.name,
        email: snap.identity.user.email,
      },
      tenants: snap.identity.tenants.map((t) => ({
        tenantId: asTenantId(t.tenantId),
        tenantName: t.tenantName,
        roles: t.roles,
        enabledApps: t.enabledApps.map((a) =>
          asAppId(a as "matriz-hub" | "spot" | "seumei" | "contracts" | "willdash"),
        ),
      })),
    },
  }
}
