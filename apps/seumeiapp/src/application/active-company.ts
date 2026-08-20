import type { SessionActor } from "../types/session-actor"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CoreAccessRepository } from "../domain/repositories/core-access-repository"
import { resolveAuthorizedCompany } from "./company-access"
import type { AuthorizedCompanyContext } from "./company-onboarding"

export const ACTIVE_COMPANY_COOKIE = "seumei_active_company"

export async function resolveActiveCompanyContext(
  actor: SessionActor,
  preferredCompanyId: string,
  core: CoreAccessRepository,
  companies: CompanyRepository,
): Promise<AuthorizedCompanyContext> {
  const user = await core.resolveUser(actor)
  const authorized = await resolveAuthorizedCompany(
    { userId: user.id, companyId: preferredCompanyId },
    core,
    companies,
  )
  return { userId: user.id, ...authorized }
}
