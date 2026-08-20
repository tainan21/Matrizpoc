import { createHash, randomBytes } from "node:crypto"
import type { Company, CompanyRole } from "../domain/company"
import {
  can,
  canInviteRole,
  canManageRole,
  normalizeInvitationEmail,
  type CompanyInvitation,
  type CompanyMember,
} from "../domain/membership"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CoreMembershipRepository } from "../domain/repositories/core-access-repository"
import type { AuthorizedCompanyContext } from "./company-onboarding"

export interface TokenGenerator {
  create(): string
}

export interface Clock {
  now(): Date
}

const SYSTEM_TOKENS: TokenGenerator = {
  create: () => randomBytes(32).toString("base64url"),
}
const SYSTEM_CLOCK: Clock = { now: () => new Date() }

export class MembershipCapabilityDeniedError extends Error {
  constructor() {
    super("Sua função não permite administrar membros")
    this.name = "MembershipCapabilityDeniedError"
  }
}

export class ProtectedOwnerError extends Error {
  constructor() {
    super("A propriedade da empresa exige um fluxo de transferência")
    this.name = "ProtectedOwnerError"
  }
}

export class MembershipTargetNotFoundError extends Error {
  constructor() {
    super("Membro ou convite indisponível")
    this.name = "MembershipTargetNotFoundError"
  }
}

export class InvitationConflictError extends Error {
  constructor() {
    super("O convite ou membership foi atualizado em outra operação")
    this.name = "InvitationConflictError"
  }
}

export class InvitationUnavailableError extends Error {
  constructor() {
    super("Este convite não está mais disponível")
    this.name = "InvitationUnavailableError"
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function removeCapabilityFor(role: CompanyRole) {
  return role === "ADMIN"
    ? "members.remove.admin" as const
    : "members.remove.standard" as const
}

export async function readCompanyMembers(
  context: AuthorizedCompanyContext,
  core: CoreMembershipRepository,
  now: Date = new Date(),
): Promise<{
  readonly members: readonly CompanyMember[]
  readonly invitations: readonly CompanyInvitation[]
}> {
  if (!can(context.role, "members.read")) {
    throw new MembershipCapabilityDeniedError()
  }
  const [members, invitations] = await Promise.all([
    core.listTenantMembers(context.company.tenantId),
    core.listPendingInvitations(context.company.tenantId),
  ])
  return {
    members,
    invitations: invitations.filter(
      ({ expiresAt }) => new Date(expiresAt).getTime() > now.getTime(),
    ),
  }
}

export async function inviteCompanyMember(
  context: AuthorizedCompanyContext,
  input: { readonly email: string; readonly role: CompanyRole },
  core: CoreMembershipRepository,
  tokens: TokenGenerator = SYSTEM_TOKENS,
  clock: Clock = SYSTEM_CLOCK,
): Promise<{
  readonly invitation: CompanyInvitation
  readonly sharePath: string
}> {
  if (!canInviteRole(context.role, input.role)) {
    throw new MembershipCapabilityDeniedError()
  }
  const email = normalizeInvitationEmail(input.email)
  const members = await core.listTenantMembers(context.company.tenantId)
  if (members.some((member) => member.email.toLowerCase() === email)) {
    throw new InvitationConflictError()
  }

  const token = tokens.create()
  const now = clock.now()
  const invitation = await core.createInvitation({
    tenantId: context.company.tenantId,
    email,
    role: input.role,
    tokenHash: hashToken(token),
    invitedByUserId: context.userId,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  })
  return { invitation, sharePath: `/invite/${token}` }
}

export async function revokeCompanyInvitation(
  context: AuthorizedCompanyContext,
  invitationId: string,
  core: CoreMembershipRepository,
  clock: Clock = SYSTEM_CLOCK,
): Promise<{ readonly invitationId: string }> {
  const invitations = await core.listPendingInvitations(context.company.tenantId)
  const invitation = invitations.find(({ id }) => id === invitationId)
  if (!invitation) throw new MembershipTargetNotFoundError()
  if (!canInviteRole(context.role, invitation.role)) {
    throw new MembershipCapabilityDeniedError()
  }
  const revoked = await core.revokeInvitation({
    tenantId: context.company.tenantId,
    invitationId,
    revokedAt: clock.now(),
  })
  if (!revoked) throw new InvitationConflictError()
  return { invitationId }
}

export async function changeCompanyMemberRole(
  context: AuthorizedCompanyContext,
  input: { readonly membershipId: string; readonly role: CompanyRole },
  core: CoreMembershipRepository,
): Promise<CompanyMember> {
  const target = await core.findTenantMember({
    tenantId: context.company.tenantId,
    membershipId: input.membershipId,
  })
  if (!target) throw new MembershipTargetNotFoundError()
  if (target.role === "OWNER") throw new ProtectedOwnerError()
  if (
    !canManageRole(context.role, target.role) ||
    !canInviteRole(context.role, input.role)
  ) {
    throw new MembershipCapabilityDeniedError()
  }
  const changed = await core.changeMembershipRole({
    tenantId: context.company.tenantId,
    membershipId: target.id,
    expectedRole: target.role,
    role: input.role,
  })
  if (!changed) throw new InvitationConflictError()
  return { ...target, role: input.role }
}

export async function removeCompanyMember(
  context: AuthorizedCompanyContext,
  membershipId: string,
  core: CoreMembershipRepository,
): Promise<{ readonly membershipId: string }> {
  const target = await core.findTenantMember({
    tenantId: context.company.tenantId,
    membershipId,
  })
  if (!target) throw new MembershipTargetNotFoundError()
  if (target.role === "OWNER") throw new ProtectedOwnerError()
  if (!can(context.role, removeCapabilityFor(target.role))) {
    throw new MembershipCapabilityDeniedError()
  }
  const removed = await core.removeMembership({
    tenantId: context.company.tenantId,
    membershipId,
    expectedRole: target.role,
  })
  if (!removed) throw new InvitationConflictError()
  return { membershipId }
}

export interface InvitationPreview {
  readonly companyId: string
  readonly companyName: string
  readonly invitedEmail: string
  readonly role: Exclude<CompanyRole, "OWNER">
  readonly expiresAt: string
}

export async function readCompanyInvitation(
  token: string,
  core: CoreMembershipRepository,
  companies: CompanyRepository,
  clock: Clock = SYSTEM_CLOCK,
): Promise<InvitationPreview> {
  const claim = token ? await core.readInvitation(hashToken(token)) : null
  if (
    !claim ||
    claim.status !== "PENDING" ||
    new Date(claim.expiresAt).getTime() <= clock.now().getTime()
  ) {
    throw new InvitationUnavailableError()
  }
  const visible = await companies.listVisibleByTenantIds([claim.tenantId])
  const company = visible.find(({ tenantId }) => tenantId === claim.tenantId)
  if (!company || company.status !== "ACTIVE") {
    throw new InvitationUnavailableError()
  }
  return {
    companyId: company.id,
    companyName: company.name,
    invitedEmail: claim.email,
    role: claim.role,
    expiresAt: claim.expiresAt,
  }
}

export async function acceptCompanyInvitation(
  user: { readonly userId: string; readonly email: string },
  token: string,
  core: CoreMembershipRepository,
  companies: CompanyRepository,
  clock: Clock = SYSTEM_CLOCK,
): Promise<{ readonly company: Company; readonly role: CompanyRole }> {
  const result = await core.acceptInvitation({
    tokenHash: hashToken(token),
    userId: user.userId,
    email: user.email.trim().toLowerCase(),
    acceptedAt: clock.now(),
  })
  if (result.kind === "email_mismatch") {
    throw new MembershipCapabilityDeniedError()
  }
  if (result.kind === "conflict") throw new InvitationConflictError()
  if (result.kind !== "accepted") throw new InvitationUnavailableError()

  const visible = await companies.listVisibleByTenantIds([result.tenantId])
  const company = visible.find(({ tenantId }) => tenantId === result.tenantId)
  if (!company || company.status !== "ACTIVE") {
    throw new InvitationUnavailableError()
  }
  return { company, role: result.role }
}
