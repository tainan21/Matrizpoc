import { describe, expect, it } from "vitest"
import type { Company } from "../domain/company"
import type {
  CompanyRepository,
  CompleteOnboardingRecord,
  CreateProvisioningRecord,
  SaveOnboardingRecord,
} from "../domain/repositories/company-repository"
import type { CoreAccessRepository } from "../domain/repositories/core-access-repository"
import {
  CompanyAccessDeniedError,
  listAuthorizedCompanies,
  resolveAuthorizedCompany,
  selectAuthorizedCompany,
} from "./company-access"

const companyA: Company = {
  id: "company_a",
  tenantId: "tenant_a",
  name: "Empresa A",
  slug: "empresa-a",
  createdByUserId: "user_a",
  status: "ACTIVE",
  operationType: "SERVICE",
  city: "Recife",
  country: "BR",
}

const companyB: Company = {
  ...companyA,
  id: "company_b",
  tenantId: "tenant_b",
  name: "Empresa B",
  slug: "empresa-b",
  createdByUserId: "user_b",
}

function coreAccess(
  memberships: readonly { tenantId: string; role: "OWNER" | "MEMBER" }[],
): CoreAccessRepository {
  return {
    resolveUser: async (actor) => ({
      id: actor.sessionUserId,
      name: actor.name,
      email: actor.email,
    }),
    listSeumeiMemberships: async () => memberships,
    hasSeumeiMembership: async (userId, tenantId) =>
      userId === "user_a" && memberships.some((item) => item.tenantId === tenantId),
    provisionOwner: async () => undefined,
    removeProvisionedTenant: async () => undefined,
  }
}

function companyRepository(seed: readonly Company[]): CompanyRepository & {
  readonly requestedTenantSets: string[][]
} {
  const requestedTenantSets: string[][] = []
  return {
    requestedTenantSets,
    async listVisibleByTenantIds(tenantIds) {
      requestedTenantSets.push([...tenantIds])
      return seed.filter(
        (company) =>
          tenantIds.includes(company.tenantId) &&
          (company.status === "ACTIVE" || company.status === "ONBOARDING"),
      )
    },
    async findByIdForTenantIds(companyId, tenantIds) {
      requestedTenantSets.push([...tenantIds])
      return (
        seed.find(
          (company) =>
            company.id === companyId && tenantIds.includes(company.tenantId),
        ) ?? null
      )
    },
    findByActorIdempotency: async () => null,
    createProvisioning: async (_input: CreateProvisioningRecord) => companyA,
    markOnboarding: async () => companyA,
    markProvisioningFailed: async () => undefined,
    removeProvisioning: async () => undefined,
    readOnboarding: async () => null,
    saveOnboarding: async (_input: SaveOnboardingRecord) => {
      throw new Error("unused")
    },
    completeOnboarding: async (_input: CompleteOnboardingRecord) => {
      throw new Error("unused")
    },
  }
}

describe("company access", () => {
  it("lists only companies whose tenants belong to the user", async () => {
    const core = coreAccess([{ tenantId: "tenant_a", role: "OWNER" }])
    const companies = companyRepository([companyA, companyB])

    await expect(listAuthorizedCompanies("user_a", core, companies)).resolves.toEqual([
      companyA,
    ])
    expect(companies.requestedTenantSets).toEqual([["tenant_a"]])
  })

  it("returns an honest empty list when the user has no memberships", async () => {
    const companies = companyRepository([companyA, companyB])

    await expect(
      listAuthorizedCompanies("user_none", coreAccess([]), companies),
    ).resolves.toEqual([])
    expect(companies.requestedTenantSets).toEqual([])
  })

  it("denies a known company when the actor has no membership for its tenant", async () => {
    const core = coreAccess([{ tenantId: "tenant_a", role: "OWNER" }])
    const companies = companyRepository([companyA, companyB])

    await expect(
      selectAuthorizedCompany(
        { userId: "user_a", companyId: "company_b" },
        core,
        companies,
      ),
    ).rejects.toBeInstanceOf(CompanyAccessDeniedError)
    expect(companies.requestedTenantSets).toEqual([["tenant_a"]])
  })

  it("resolves an active company only inside the membership set", async () => {
    const core = coreAccess([{ tenantId: "tenant_a", role: "OWNER" }])
    const companies = companyRepository([companyA, companyB])

    await expect(
      resolveAuthorizedCompany(
        { userId: "user_a", companyId: "company_a" },
        core,
        companies,
      ),
    ).resolves.toEqual({ company: companyA, role: "OWNER" })
  })

  it("uses the same denial for a missing company and a foreign company", async () => {
    const core = coreAccess([{ tenantId: "tenant_a", role: "OWNER" }])
    const companies = companyRepository([companyB])

    const foreign = selectAuthorizedCompany(
      { userId: "user_a", companyId: "company_b" },
      core,
      companies,
    ).catch((error: unknown) => error)
    const missing = selectAuthorizedCompany(
      { userId: "user_a", companyId: "company_missing" },
      core,
      companies,
    ).catch((error: unknown) => error)

    await expect(foreign).resolves.toMatchObject({
      name: "CompanyAccessDeniedError",
      message: "Empresa indisponível para esta sessão",
    })
    await expect(missing).resolves.toMatchObject({
      name: "CompanyAccessDeniedError",
      message: "Empresa indisponível para esta sessão",
    })
  })
})
