import type { UserId } from "@matriz/foundation-types"
import type { Membership } from "../../memberships/domain/membership"
import type { SeumeiTenantContext } from "../../memberships/domain/tenant-context"
import type { Company } from "./company"

export interface CompanyRepository {
  listForMemberships(
    userId: UserId,
    memberships: readonly Membership[],
  ): Promise<readonly Company[]>
  findBySlugForMemberships(
    userId: UserId,
    slug: string,
    memberships: readonly Membership[],
  ): Promise<Company | null>
  getCurrent(context: SeumeiTenantContext): Promise<Company | null>
}
