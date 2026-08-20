import type { SessionActor } from "../../types/session-actor"
import type { CompanyRole } from "../company"
import type { CompanyInvitation, CompanyMember } from "../membership"

export interface CoreUser {
  readonly id: string
  readonly name: string
  readonly email: string
}

export interface SeumeiMembership {
  readonly tenantId: string
  readonly role: CompanyRole
}

export type InvitationAcceptanceResult =
  | { readonly kind: "accepted"; readonly tenantId: string; readonly role: CompanyRole }
  | {
      readonly kind:
        | "invalid"
        | "email_mismatch"
        | "expired"
        | "unusable"
        | "disabled"
        | "conflict"
    }

export interface InvitationClaim {
  readonly id: string
  readonly tenantId: string
  readonly email: string
  readonly role: Exclude<CompanyRole, "OWNER">
  readonly status: "PENDING" | "ACCEPTED" | "REVOKED"
  readonly expiresAt: string
  readonly acceptedByUserId: string | null
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

export interface CoreMembershipRepository {
  listTenantMembers(tenantId: string): Promise<readonly CompanyMember[]>
  listPendingInvitations(
    tenantId: string,
  ): Promise<readonly CompanyInvitation[]>
  createInvitation(input: {
    tenantId: string
    email: string
    role: Exclude<CompanyRole, "OWNER">
    tokenHash: string
    invitedByUserId: string
    expiresAt: Date
  }): Promise<CompanyInvitation>
  revokeInvitation(input: {
    tenantId: string
    invitationId: string
    revokedAt: Date
  }): Promise<boolean>
  readInvitation(tokenHash: string): Promise<InvitationClaim | null>
  acceptInvitation(input: {
    tokenHash: string
    userId: string
    email: string
    acceptedAt: Date
  }): Promise<InvitationAcceptanceResult>
  findTenantMember(input: {
    tenantId: string
    membershipId: string
  }): Promise<CompanyMember | null>
  changeMembershipRole(input: {
    tenantId: string
    membershipId: string
    expectedRole: Exclude<CompanyRole, "OWNER">
    role: Exclude<CompanyRole, "OWNER">
  }): Promise<boolean>
  removeMembership(input: {
    tenantId: string
    membershipId: string
    expectedRole: Exclude<CompanyRole, "OWNER">
  }): Promise<boolean>
}

export type CompleteCoreAccessRepository = CoreAccessRepository &
  CoreMembershipRepository
