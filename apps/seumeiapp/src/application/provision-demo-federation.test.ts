import { describe, expect, it } from "vitest"
import type { Company, CompanyOnboarding, CompanyRole } from "../domain/company"
import type { CompanyRepository, CompleteOnboardingRecord, CreateProvisioningRecord } from "../domain/repositories/company-repository"
import type { CoreAccessRepository, CoreUser } from "../domain/repositories/core-access-repository"
import { provisionDemoFederation } from "./provision-demo-federation"

type DemoCore = CoreAccessRepository & {
  provisionMembership(input: { tenantId: string; userId: string; role: Exclude<CompanyRole, "OWNER"> }): Promise<void>
}

function harness(existingSlug?: { slug: string; createdByUserId: string }) {
  const users = new Map<string, CoreUser>()
  const companiesByKey = new Map<string, Company>()
  const companiesBySlug = new Map<string, Company>()
  const onboarding = new Map<string, CompanyOnboarding>()
  const memberships = new Set<string>()

  if (existingSlug) {
    const existing: Company = {
      id: "foreign-company",
      tenantId: "foreign-tenant",
      name: "Foreign",
      slug: existingSlug.slug,
      createdByUserId: existingSlug.createdByUserId,
      status: "ACTIVE",
      operationType: "PHYSICAL_STORE",
      city: "São Paulo",
      country: "BR",
    }
    companiesBySlug.set(existing.slug, existing)
  }

  const core: DemoCore = {
    async resolveUser(actor) {
      const email = actor.email.toLowerCase()
      const current = users.get(email) ?? { id: `user-${users.size + 1}`, name: actor.name, email }
      users.set(email, current)
      return current
    },
    async listSeumeiMemberships(userId) {
      return [...memberships]
        .filter((key) => key.startsWith(`${userId}:`))
        .map((key) => ({ tenantId: key.split(":")[1]!, role: key.split(":")[2]! as CompanyRole }))
    },
    async hasSeumeiMembership(userId, tenantId) {
      return [...memberships].some((key) => key.startsWith(`${userId}:${tenantId}:`))
    },
    async provisionOwner(input) {
      memberships.add(`${input.userId}:${input.tenantId}:OWNER`)
    },
    async provisionMembership(input) {
      memberships.add(`${input.userId}:${input.tenantId}:${input.role}`)
    },
    async removeProvisionedTenant() {},
  }

  const companies: CompanyRepository = {
    async listVisibleByTenantIds(tenantIds) {
      return [...companiesBySlug.values()].filter((company) => tenantIds.includes(company.tenantId))
    },
    async findByIdForTenantIds(companyId, tenantIds) {
      return [...companiesBySlug.values()].find((company) => company.id === companyId && tenantIds.includes(company.tenantId)) ?? null
    },
    async findByActorIdempotency(userId, key) {
      return companiesByKey.get(`${userId}:${key}`) ?? null
    },
    async createProvisioning(input: CreateProvisioningRecord) {
      if (companiesBySlug.has(input.slug)) throw new Error("DEMO_SLUG_COLLISION")
      const company: Company = {
        id: `company-${companiesBySlug.size + 1}`,
        tenantId: input.tenantId,
        name: input.name,
        slug: input.slug,
        createdByUserId: input.createdByUserId,
        status: "PROVISIONING",
        operationType: null,
        city: null,
        country: "BR",
      }
      companiesBySlug.set(company.slug, company)
      companiesByKey.set(`${input.createdByUserId}:${input.idempotencyKey}`, company)
      onboarding.set(company.id, {
        companyId: company.id,
        tenantId: company.tenantId,
        currentStep: "IDENTITY",
        version: 1,
        draftName: company.name,
        draftSlug: company.slug,
        draftOperationType: null,
        draftCity: null,
        draftCountry: "BR",
        draftCurrency: "BRL",
        completedSteps: [],
        completedAt: null,
      })
      return company
    },
    async markOnboarding(companyId) {
      const company = [...companiesBySlug.values()].find((item) => item.id === companyId)!
      const updated = { ...company, status: "ONBOARDING" as const }
      companiesBySlug.set(updated.slug, updated)
      companiesByKey.forEach((value, key) => { if (value.id === companyId) companiesByKey.set(key, updated) })
      return updated
    },
    async markProvisioningFailed() {},
    async removeProvisioning(companyId) {
      const company = [...companiesBySlug.values()].find((item) => item.id === companyId)
      if (company) companiesBySlug.delete(company.slug)
    },
    async readOnboarding(companyId) {
      return onboarding.get(companyId) ?? null
    },
    async saveOnboarding() { throw new Error("unused") },
    async completeOnboarding(input: CompleteOnboardingRecord) {
      const company = [...companiesBySlug.values()].find((item) => item.id === input.companyId)!
      const completedCompany = { ...company, status: "ACTIVE" as const, operationType: input.operationType, city: input.city, country: input.country }
      const completedOnboarding = { ...onboarding.get(input.companyId)!, currentStep: "COMPLETED" as const, version: 2, completedAt: "2026-08-24T12:00:00.000Z" }
      companiesBySlug.set(completedCompany.slug, completedCompany)
      companiesByKey.forEach((value, key) => { if (value.id === input.companyId) companiesByKey.set(key, completedCompany) })
      onboarding.set(input.companyId, completedOnboarding)
      return { company: completedCompany, onboarding: completedOnboarding }
    },
  }

  return { core, companies, users, memberships, companiesBySlug }
}

describe("provisionDemoFederation", () => {
  it("creates two active companies, global ownership and one restricted operator membership", async () => {
    const state = harness()

    const first = await provisionDemoFederation({ MATRIZ_DEMO_PROVISIONING: "true" }, state.core, state.companies)
    const second = await provisionDemoFederation({ MATRIZ_DEMO_PROVISIONING: "true" }, state.core, state.companies)

    expect(first.companies.map((company) => [company.slug, company.status])).toEqual([
      ["galaxia-burger", "ACTIVE"],
      ["sabor-e-brasa", "ACTIVE"],
    ])
    expect(second.companies).toEqual(first.companies)
    expect(state.users.size).toBe(2)
    expect(state.companiesBySlug.size).toBe(2)
    expect(state.memberships.size).toBe(3)
    const operator = state.users.get("operacao@galaxiaburger.demo")!
    const galaxia = state.companiesBySlug.get("galaxia-burger")!
    const sabor = state.companiesBySlug.get("sabor-e-brasa")!
    expect(await state.core.hasSeumeiMembership(operator.id, galaxia.tenantId)).toBe(true)
    expect(await state.core.hasSeumeiMembership(operator.id, sabor.tenantId)).toBe(false)
  })

  it("refuses to mutate an unrelated company with a colliding demo slug", async () => {
    const state = harness({ slug: "galaxia-burger", createdByUserId: "foreign-user" })
    await expect(
      provisionDemoFederation({ MATRIZ_DEMO_PROVISIONING: "true" }, state.core, state.companies),
    ).rejects.toThrowError("DEMO_SLUG_COLLISION")
    expect(state.companiesBySlug.get("galaxia-burger")?.tenantId).toBe("foreign-tenant")
  })
})
