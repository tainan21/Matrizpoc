import type { UserId } from "@matriz/foundation-types"
import type { CompanyId } from "../../companies/domain/company"
import type {
  Membership,
  MembershipId,
  MembershipRole,
  SeumeiPermission,
} from "./membership"

export interface SeumeiTenantContext {
  readonly userId: UserId
  readonly companyId: CompanyId
  readonly membershipId: MembershipId
  readonly role: MembershipRole
  readonly permissions: readonly SeumeiPermission[]
}

export function createTenantContext(input: {
  readonly userId: UserId
  readonly companyId: CompanyId
  readonly membership: Membership
}): SeumeiTenantContext {
  if (input.membership.userId !== input.userId) {
    throw new Error("membership-user-mismatch")
  }
  if (input.membership.companyId !== input.companyId) {
    throw new Error("membership-company-mismatch")
  }
  if (input.membership.status !== "active") {
    throw new Error("membership-disabled")
  }

  const permissions = Object.freeze([...input.membership.permissions])
  return Object.freeze({
    userId: input.userId,
    companyId: input.companyId,
    membershipId: input.membership.id,
    role: input.membership.role,
    permissions,
  })
}
