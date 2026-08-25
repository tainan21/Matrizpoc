import type { UserId } from "@matriz/foundation-types"
import { asCompanyId } from "../domains/companies/domain/company"
import {
  asMembershipId,
  type Membership,
  type SeumeiPermission,
} from "../domains/memberships/domain/membership"

const GALAXIA_OWNER_PERMISSIONS: readonly SeumeiPermission[] = [
  "company.view",
  "company.manage",
  "apps.view",
  "apps.manage",
  "dashboard.view",
  "crm.view",
  "products.view",
  "products.manage",
  "orders.view",
  "inventory.view",
  "finance.view",
  "store.view",
]

const MATRIZ_ADMIN_PERMISSIONS: readonly SeumeiPermission[] = [
  "company.view",
  "apps.view",
  "dashboard.view",
  "crm.view",
  "products.view",
  "products.manage",
  "reports.view",
]

export function createFixtureMemberships(demoUserId: UserId): readonly Membership[] {
  return [
    {
      id: asMembershipId("membership-demo-galaxia"),
      userId: demoUserId,
      companyId: asCompanyId("company-galaxia"),
      role: "owner",
      status: "active",
      permissions: GALAXIA_OWNER_PERMISSIONS,
    },
    {
      id: asMembershipId("membership-demo-matriz-labs"),
      userId: demoUserId,
      companyId: asCompanyId("company-matriz-labs"),
      role: "admin",
      status: "active",
      permissions: MATRIZ_ADMIN_PERMISSIONS,
    },
  ]
}
