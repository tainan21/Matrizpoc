import type { AuthSession } from "@matriz/platform-auth"
import type { TenantId } from "@matriz/foundation-types"

export interface WilldashSessionViewModel {
  readonly userName: string
  readonly userEmail: string
  readonly activeTenantId: TenantId
  readonly activeTenantName: string
  readonly canViewTelemetry: boolean
}

export function toWilldashSessionViewModel(
  session: AuthSession,
): WilldashSessionViewModel {
  const tenant =
    session.identity.tenants.find((t) => t.tenantId === session.activeTenantId) ??
    session.identity.tenants[0]!
  return {
    userName: session.identity.user.name,
    userEmail: session.identity.user.email,
    activeTenantId: tenant.tenantId,
    activeTenantName: tenant.tenantName,
    canViewTelemetry: tenant.roles.length > 0,
  }
}
