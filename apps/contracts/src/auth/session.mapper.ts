import type { AuthSession } from "@matriz/platform-auth"
import type { TenantId } from "@matriz/foundation-types"

export interface ContractsSessionViewModel {
  readonly userName: string
  readonly userEmail: string
  readonly activeTenantId: TenantId
  readonly activeTenantName: string
  readonly canIssueContracts: boolean
}

export function toContractsSessionViewModel(
  session: AuthSession,
): ContractsSessionViewModel {
  const tenant =
    session.identity.tenants.find((t) => t.tenantId === session.activeTenantId) ??
    session.identity.tenants[0]!
  return {
    userName: session.identity.user.name,
    userEmail: session.identity.user.email,
    activeTenantId: tenant.tenantId,
    activeTenantName: tenant.tenantName,
    canIssueContracts: tenant.roles.includes("owner") || tenant.roles.includes("legal"),
  }
}
