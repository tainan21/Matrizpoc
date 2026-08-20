import type { InvitationPreview } from "../../application/company-memberships"
import type { AuthorizedCompanyContext } from "../../application/company-onboarding"
import type { CompanyRole } from "../../domain/company"
import {
  can,
  canInviteRole,
  canManageRole,
  type CompanyInvitation,
  type CompanyMember,
} from "../../domain/membership"

const ROLE_LABELS: Readonly<Record<CompanyRole, string>> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MEMBER: "Membro",
  VIEWER: "Leitor",
}

export interface RoleOptionViewModel {
  readonly value: Exclude<CompanyRole, "OWNER">
  readonly label: string
}

export interface MemberViewModel {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly role: CompanyRole
  readonly roleLabel: string
  readonly joinedAtLabel: string
  readonly isCurrentUser: boolean
  readonly canChangeRole: boolean
  readonly canRemove: boolean
  readonly availableRoles: readonly RoleOptionViewModel[]
}

export interface InvitationViewModel {
  readonly id: string
  readonly email: string
  readonly roleLabel: string
  readonly expiresAtLabel: string
  readonly canRevoke: boolean
}

export interface MemberDirectoryViewModel {
  readonly companyName: string
  readonly actorRoleLabel: string
  readonly availableInvitationRoles: readonly RoleOptionViewModel[]
  readonly members: readonly MemberViewModel[]
  readonly invitations: readonly InvitationViewModel[]
}

function dateLabel(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" })
}

function availableRoles(actorRole: CompanyRole): readonly RoleOptionViewModel[] {
  return (["ADMIN", "MEMBER", "VIEWER"] as const)
    .filter((role) => canInviteRole(actorRole, role))
    .map((role) => ({ value: role, label: ROLE_LABELS[role] }))
}

function canRemoveRole(actorRole: CompanyRole, targetRole: CompanyRole): boolean {
  if (targetRole === "OWNER") return false
  return can(
    actorRole,
    targetRole === "ADMIN" ? "members.remove.admin" : "members.remove.standard",
  )
}

export function toMemberDirectoryViewModel(
  context: AuthorizedCompanyContext,
  directory: {
    readonly members: readonly CompanyMember[]
    readonly invitations: readonly CompanyInvitation[]
  },
): MemberDirectoryViewModel {
  return {
    companyName: context.company.name,
    actorRoleLabel: ROLE_LABELS[context.role],
    availableInvitationRoles: availableRoles(context.role),
    members: directory.members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      roleLabel: ROLE_LABELS[member.role],
      joinedAtLabel: dateLabel(member.joinedAt),
      isCurrentUser: member.userId === context.userId,
      canChangeRole: canManageRole(context.role, member.role),
      canRemove: canRemoveRole(context.role, member.role),
      availableRoles: availableRoles(context.role),
    })),
    invitations: directory.invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      roleLabel: ROLE_LABELS[invitation.role],
      expiresAtLabel: dateLabel(invitation.expiresAt),
      canRevoke: canInviteRole(context.role, invitation.role),
    })),
  }
}

export interface InvitationAcceptanceViewModel {
  readonly companyName: string
  readonly invitedEmail: string
  readonly roleLabel: string
  readonly expiresAtLabel: string
  readonly canAccept: boolean
}

export function toInvitationViewModel(
  invitation: InvitationPreview,
  authenticatedEmail: string,
): InvitationAcceptanceViewModel {
  return {
    companyName: invitation.companyName,
    invitedEmail: invitation.invitedEmail,
    roleLabel: ROLE_LABELS[invitation.role],
    expiresAtLabel: dateLabel(invitation.expiresAt),
    canAccept:
      invitation.invitedEmail === authenticatedEmail.trim().toLowerCase(),
  }
}
