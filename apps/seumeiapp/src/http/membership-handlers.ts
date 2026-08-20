import {
  InvitationConflictError,
  InvitationUnavailableError,
  MembershipCapabilityDeniedError,
  MembershipTargetNotFoundError,
  ProtectedOwnerError,
  acceptCompanyInvitation,
  changeCompanyMemberRole,
  inviteCompanyMember,
  readCompanyMembers,
  removeCompanyMember,
  revokeCompanyInvitation,
  type Clock,
  type TokenGenerator,
} from "../application/company-memberships"
import { resolveActiveCompanyContext } from "../application/active-company"
import { CompanyAccessDeniedError } from "../application/company-access"
import { InvalidInvitationEmailError } from "../domain/membership"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CompleteCoreAccessRepository } from "../domain/repositories/core-access-repository"
import type { SessionActor } from "../types/session-actor"
import { toWorkspaceViewModel } from "../ui/presenters/company.presenter"
import { toMemberDirectoryViewModel } from "../ui/presenters/membership.presenter"
import type { HttpResult } from "./company-handlers"

export interface MembershipHttpServices {
  readonly core: CompleteCoreAccessRepository
  readonly companies: CompanyRepository
}

export interface InvitationAcceptanceHttpResult extends HttpResult {
  readonly activeCompanyId?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function membershipError(error: unknown): HttpResult {
  if (error instanceof CompanyAccessDeniedError) {
    return { status: 403, body: { error: "company_forbidden" } }
  }
  if (error instanceof MembershipCapabilityDeniedError) {
    return { status: 403, body: { error: "capability_forbidden" } }
  }
  if (error instanceof MembershipTargetNotFoundError) {
    return { status: 404, body: { error: "membership_target_not_found" } }
  }
  if (error instanceof ProtectedOwnerError) {
    return { status: 409, body: { error: "owner_protected" } }
  }
  if (error instanceof InvitationConflictError) {
    return { status: 409, body: { error: "membership_conflict" } }
  }
  if (error instanceof InvitationUnavailableError) {
    return { status: 410, body: { error: "invitation_unavailable" } }
  }
  if (error instanceof InvalidInvitationEmailError) {
    return { status: 400, body: { error: "invalid_request" } }
  }
  return { status: 500, body: { error: "internal_error" } }
}

async function membershipContext(
  actor: SessionActor,
  companyId: string,
  services: MembershipHttpServices,
) {
  return resolveActiveCompanyContext(
    actor,
    companyId,
    services.core,
    services.companies,
  )
}

export async function listMembersHandler(
  actor: SessionActor,
  companyId: string,
  services: MembershipHttpServices,
): Promise<HttpResult> {
  try {
    const context = await membershipContext(actor, companyId, services)
    const directory = await readCompanyMembers(context, services.core)
    return {
      status: 200,
      body: { directory: toMemberDirectoryViewModel(context, directory) },
    }
  } catch (error) {
    return membershipError(error)
  }
}

export async function createInvitationHandler(
  actor: SessionActor,
  companyId: string,
  body: unknown,
  services: MembershipHttpServices,
  tokens?: TokenGenerator,
  clock?: Clock,
): Promise<HttpResult> {
  if (
    !isRecord(body) ||
    Object.hasOwn(body, "tenantId") ||
    typeof body.email !== "string" ||
    (body.role !== "ADMIN" && body.role !== "MEMBER" && body.role !== "VIEWER")
  ) {
    return { status: 400, body: { error: "invalid_request" } }
  }
  try {
    const context = await membershipContext(actor, companyId, services)
    const created = await inviteCompanyMember(
      context,
      { email: body.email, role: body.role },
      services.core,
      tokens,
      clock,
    )
    return {
      status: 201,
      body: {
        invitation: {
          id: created.invitation.id,
          email: created.invitation.email,
          role: created.invitation.role,
          expiresAt: created.invitation.expiresAt,
        },
        sharePath: created.sharePath,
      },
    }
  } catch (error) {
    return membershipError(error)
  }
}

export async function revokeInvitationHandler(
  actor: SessionActor,
  companyId: string,
  invitationId: string,
  services: MembershipHttpServices,
  clock?: Clock,
): Promise<HttpResult> {
  try {
    const context = await membershipContext(actor, companyId, services)
    const result = await revokeCompanyInvitation(
      context,
      invitationId,
      services.core,
      clock,
    )
    return { status: 200, body: result }
  } catch (error) {
    return membershipError(error)
  }
}

export async function changeMembershipRoleHandler(
  actor: SessionActor,
  companyId: string,
  membershipId: string,
  body: unknown,
  services: MembershipHttpServices,
): Promise<HttpResult> {
  if (
    !isRecord(body) ||
    Object.hasOwn(body, "tenantId") ||
    (body.role !== "ADMIN" && body.role !== "MEMBER" && body.role !== "VIEWER")
  ) {
    return { status: 400, body: { error: "invalid_request" } }
  }
  try {
    const context = await membershipContext(actor, companyId, services)
    const member = await changeCompanyMemberRole(
      context,
      { membershipId, role: body.role },
      services.core,
    )
    const presented = toMemberDirectoryViewModel(context, {
      members: [member],
      invitations: [],
    }).members[0]
    return { status: 200, body: { member: presented } }
  } catch (error) {
    return membershipError(error)
  }
}

export async function removeMembershipHandler(
  actor: SessionActor,
  companyId: string,
  membershipId: string,
  services: MembershipHttpServices,
): Promise<HttpResult> {
  try {
    const context = await membershipContext(actor, companyId, services)
    const result = await removeCompanyMember(
      context,
      membershipId,
      services.core,
    )
    return { status: 200, body: result }
  } catch (error) {
    return membershipError(error)
  }
}

export async function acceptInvitationHandler(
  actor: SessionActor,
  body: unknown,
  services: MembershipHttpServices,
  clock?: Clock,
): Promise<InvitationAcceptanceHttpResult> {
  if (
    !isRecord(body) ||
    Object.hasOwn(body, "tenantId") ||
    typeof body.token !== "string" ||
    body.token.length < 8 ||
    body.token.length > 128
  ) {
    return { status: 400, body: { error: "invalid_request" } }
  }
  try {
    const user = await services.core.resolveUser(actor)
    const accepted = await acceptCompanyInvitation(
      { userId: user.id, email: user.email },
      body.token,
      services.core,
      services.companies,
      clock,
    )
    return {
      status: 200,
      activeCompanyId: accepted.company.id,
      body: { workspace: toWorkspaceViewModel(accepted.company) },
    }
  } catch (error) {
    return membershipError(error)
  }
}
