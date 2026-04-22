import type { AuthSession } from "@matriz/platform-auth"

export interface HubSessionViewModel {
  readonly userName: string
  readonly userEmail: string
  readonly activeTenantName: string
  readonly activeTenantId: string
  readonly visibleApps: readonly string[]
}

export function toHubSessionViewModel(session: AuthSession): HubSessionViewModel {
  const active = session.identity.tenants.find(
    (t) => t.tenantId === session.activeTenantId,
  )
  return {
    userName: session.identity.user.name,
    userEmail: session.identity.user.email,
    activeTenantName: active?.tenantName ?? "—",
    activeTenantId: session.activeTenantId,
    visibleApps: active?.enabledApps ?? [],
  }
}
