import type { UserId } from "@matriz/foundation-types"
import type { CompanyId } from "../../companies/domain/company"
import type { Membership } from "./membership"

export interface MembershipRepository {
  listForUser(userId: UserId): Promise<readonly Membership[]>
  find(userId: UserId, companyId: CompanyId): Promise<Membership | null>
}
