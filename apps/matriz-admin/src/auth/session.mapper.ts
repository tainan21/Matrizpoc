import type { AuthSession } from "@matriz/platform-auth"
import type { TenantId } from "@matriz/foundation-types"

export interface SeumeiSessionViewModel {
  readonly userName: string
  readonly userEmail: string
  readonly activeTenantId: TenantId
  readonly activeTenantName: string
  readonly canEditOperation: boolean
}

export function toSeumeiSessionViewModel(session: AuthSession): SeumeiSessionViewModel {
  const tenant =
    session.identity.tenants.find((t) => t.tenantId === session.activeTenantId) ??
    session.identity.tenants[0]!
  const isOperator = tenant.roles.includes("owner") || tenant.roles.includes("manager")
  return {
    userName: session.identity.user.name,
    userEmail: session.identity.user.email,
    activeTenantId: tenant.tenantId,
    activeTenantName: tenant.tenantName,
    canEditOperation: isOperator,
  }
}
