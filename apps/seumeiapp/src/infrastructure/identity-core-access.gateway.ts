import type { CompleteCoreAccessRepository } from "../domain/repositories/core-access-repository"

export class IdentityServiceUnavailableError extends Error {
  constructor() {
    super("Serviço de identidade indisponível")
    this.name = "IdentityServiceUnavailableError"
  }
}

export function createIdentityCoreAccessGateway(env: Readonly<Record<string, string | undefined>>): CompleteCoreAccessRepository {
  const issuer = env.MATRIZ_IDENTITY_ISSUER
  const token = env.SEUMEI_IDENTITY_SERVICE_TOKEN
  if (!issuer || !token || token.length < 32) throw new IdentityServiceUnavailableError()
  const endpoint = new URL("/api/internal/v1/seumei/access", issuer).toString()

  async function invoke<T>(action: string, input: unknown): Promise<T> {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-matriz-app-id": "seumei",
        },
        body: JSON.stringify({ action, input }),
        signal: AbortSignal.timeout(5_000),
      })
      if (!response.ok) throw new IdentityServiceUnavailableError()
      const body = await response.json() as { result: T }
      return body.result
    } catch {
      throw new IdentityServiceUnavailableError()
    }
  }

  return {
    resolveUser: (input) => invoke("resolveUser", input),
    listSeumeiMemberships: (input) => invoke("listSeumeiMemberships", input),
    hasSeumeiMembership: (userId, tenantId) => invoke("hasSeumeiMembership", { userId, tenantId }),
    listTenantMembers: (input) => invoke("listTenantMembers", input),
    listPendingInvitations: (input) => invoke("listPendingInvitations", input),
    createInvitation: (input) => invoke("createInvitation", { ...input, expiresAt: input.expiresAt.toISOString() }),
    revokeInvitation: (input) => invoke("revokeInvitation", { ...input, revokedAt: input.revokedAt.toISOString() }),
    readInvitation: (input) => invoke("readInvitation", input),
    acceptInvitation: (input) => invoke("acceptInvitation", { ...input, acceptedAt: input.acceptedAt.toISOString() }),
    findTenantMember: (input) => invoke("findTenantMember", input),
    changeMembershipRole: (input) => invoke("changeMembershipRole", input),
    removeMembership: (input) => invoke("removeMembership", input),
    provisionOwner: (input) => invoke("provisionOwner", input),
    provisionMembership: (input) => invoke("provisionMembership", input),
    removeProvisionedTenant: (input) => invoke("removeProvisionedTenant", input),
  }
}
