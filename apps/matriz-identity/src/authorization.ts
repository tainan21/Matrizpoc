export type AuthorizationContext = Readonly<{
  userId: string
  tenantId: string
  appId: string
  membershipId: string
  tenantRoles: readonly string[]
  appRoles: readonly string[]
  capabilities: readonly string[]
  sessionId: string
  traceId: string
}>

export type ActiveAccess = Omit<AuthorizationContext, "sessionId" | "traceId">

export interface AccessRepository {
  findAccess(input: { userId: string; tenantId: string; appId: string }): Promise<ActiveAccess | null>
}

export async function resolveAuthorizationContext(
  repository: AccessRepository,
  identity: { userId: string; tenantId: string; appId: string; sessionId: string },
  traceId: string,
): Promise<AuthorizationContext> {
  const access = await repository.findAccess({
    userId: identity.userId,
    tenantId: identity.tenantId,
    appId: identity.appId,
  })
  if (!access) throw new Error("Access denied: active tenant membership and app grant required")
  return Object.freeze({
    ...access,
    tenantRoles: Object.freeze([...access.tenantRoles]),
    appRoles: Object.freeze([...access.appRoles]),
    capabilities: Object.freeze([...access.capabilities]),
    sessionId: identity.sessionId,
    traceId,
  })
}
