import type { UserId } from "@matriz/foundation-types"
import type { CompanyId } from "../../companies/domain/company"
import type { MembershipRepository } from "../domain/membership.repository"
import {
  createTenantContext,
  type SeumeiTenantContext,
} from "../domain/tenant-context"

export type TenantResolution =
  | { readonly ok: true; readonly context: SeumeiTenantContext }
  | {
      readonly ok: false
      readonly error: "membership-required" | "membership-disabled"
    }

export async function resolveTenantContext(input: {
  readonly userId: UserId
  readonly requestedCompanyId: CompanyId
  readonly memberships: MembershipRepository
}): Promise<TenantResolution> {
  const membership = await input.memberships.find(
    input.userId,
    input.requestedCompanyId,
  )
  if (!membership) return { ok: false, error: "membership-required" }
  if (membership.status !== "active") {
    return { ok: false, error: "membership-disabled" }
  }
  return {
    ok: true,
    context: createTenantContext({
      userId: input.userId,
      companyId: input.requestedCompanyId,
      membership,
    }),
  }
}
