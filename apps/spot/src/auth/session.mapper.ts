/**
 * Maps a raw `AuthSession` into a Spot-friendly view-model. Keeps Spot
 * screens from branching on session internals (L6).
 */
import type { AuthSession } from "@matriz/platform-auth"

export interface SpotSessionViewModel {
  readonly userName: string
  readonly userEmail: string
  readonly activeTenantName: string
  readonly activeTenantId: string
  readonly canCreateGigs: boolean
  readonly canRequestContracts: boolean
}

export function toSpotSessionViewModel(
  session: AuthSession,
): SpotSessionViewModel {
  const active = session.identity.tenants.find(
    (t) => t.tenantId === session.activeTenantId,
  )
  const roles = active?.roles ?? []
  return {
    userName: session.identity.user.name,
    userEmail: session.identity.user.email,
    activeTenantName: active?.tenantName ?? "—",
    activeTenantId: session.activeTenantId,
    canCreateGigs: roles.includes("owner") || roles.includes("editor"),
    canRequestContracts: roles.includes("owner"),
  }
}
