import { getRequestMockSession } from "./mock-auth-server"

export interface HubActorContext {
  readonly userId: string
  readonly tenantId: string
  readonly roles: readonly string[]
}

/** Server-side identity bridge. Client IDs never become authority. */
export function resolveHubActor(request: Request): HubActorContext | null {
  const session = getRequestMockSession(request)
  if (!session) return null
  const tenant = session.identity.tenants.find((candidate) => candidate.tenantId === session.activeTenantId)
  if (!tenant) return null
  return { userId: session.identity.user.id, tenantId: tenant.tenantId, roles: tenant.roles }
}
