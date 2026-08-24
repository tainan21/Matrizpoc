import type { UserId } from "@matriz/foundation-types"
import type { CompanyId } from "../../companies/domain/company"

export type MembershipId = string & { readonly __brand: "SeumeiMembershipId" }

export function asMembershipId(value: string): MembershipId {
  return value as MembershipId
}

export type MembershipRole = "owner" | "admin" | "member" | "guest"
export type MembershipStatus = "active" | "invited" | "disabled"

export type SeumeiPermission =
  | "company.view"
  | "company.manage"
  | "apps.view"
  | "apps.manage"
  | "dashboard.view"
  | "crm.view"
  | "products.view"
  | "orders.view"
  | "inventory.view"
  | "finance.view"
  | "store.view"
  | "reports.view"

export interface Membership {
  readonly id: MembershipId
  readonly userId: UserId
  readonly companyId: CompanyId
  readonly role: MembershipRole
  readonly status: MembershipStatus
  readonly permissions: readonly SeumeiPermission[]
}
