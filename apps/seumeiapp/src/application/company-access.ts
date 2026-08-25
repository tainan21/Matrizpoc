import type { Company, CompanyRole } from "../domain/company"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CoreAccessRepository } from "../domain/repositories/core-access-repository"

export class CompanyAccessDeniedError extends Error {
  constructor() {
    super("Empresa indisponível para esta sessão")
    this.name = "CompanyAccessDeniedError"
  }
}

export async function listAuthorizedCompanies(
  userId: string,
  core: CoreAccessRepository,
  companies: CompanyRepository,
): Promise<readonly Company[]> {
  const memberships = await core.listSeumeiMemberships(userId)
  if (memberships.length === 0) return []

  const tenantIds = [...new Set(memberships.map(({ tenantId }) => tenantId))]
  return companies.listVisibleByTenantIds(tenantIds)
}

export async function resolveAuthorizedCompany(
  input: { userId: string; companyId: string },
  core: CoreAccessRepository,
  companies: CompanyRepository,
): Promise<{ company: Company; role: CompanyRole }> {
  const memberships = await core.listSeumeiMemberships(input.userId)
  const tenantIds = [...new Set(memberships.map(({ tenantId }) => tenantId))]
  if (tenantIds.length === 0) throw new CompanyAccessDeniedError()

  const company = await companies.findByIdForTenantIds(
    input.companyId,
    tenantIds,
  )
  if (
    !company ||
    (company.status !== "ACTIVE" && company.status !== "ONBOARDING")
  ) {
    throw new CompanyAccessDeniedError()
  }

  const membership = memberships.find(
    ({ tenantId }) => tenantId === company.tenantId,
  )
  if (!membership) throw new CompanyAccessDeniedError()

  return { company, role: membership.role }
}

export async function selectAuthorizedCompany(
  input: { userId: string; companyId: string },
  core: CoreAccessRepository,
  companies: CompanyRepository,
): Promise<{ company: Company; role: CompanyRole }> {
  return resolveAuthorizedCompany(input, core, companies)
}
