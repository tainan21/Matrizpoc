import type { CompanyRole, SessionActor } from "../company"

export interface CoreUser {
  readonly id: string
  readonly name: string
  readonly email: string
}

export interface SeumeiMembership {
  readonly tenantId: string
  readonly role: CompanyRole
}

export interface CoreAccessRepository {
  resolveUser(actor: SessionActor): Promise<CoreUser>
  listSeumeiMemberships(userId: string): Promise<readonly SeumeiMembership[]>
  hasSeumeiMembership(userId: string, tenantId: string): Promise<boolean>
  provisionOwner(input: {
    tenantId: string
    tenantName: string
    tenantSlug: string
    userId: string
  }): Promise<void>
  removeProvisionedTenant(input: {
    tenantId: string
    userId: string
  }): Promise<void>
}
