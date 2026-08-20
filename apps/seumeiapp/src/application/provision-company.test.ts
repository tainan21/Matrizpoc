import { describe, expect, it } from "vitest"
import type { Company } from "../domain/company"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CoreAccessRepository } from "../domain/repositories/core-access-repository"
import {
  CompanyProvisioningUnavailableError,
  CompanySlugConflictError,
  InvalidIdempotencyKeyError,
  provisionCompany,
} from "./provision-company"

const actor = {
  sessionUserId: "session_user_a",
  name: "Ana",
  email: "ana@example.com",
}
const idempotencyKey = "11111111-1111-4111-8111-111111111111"

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: "company_a",
    tenantId: "tenant_generated",
    name: "Café Aurora",
    slug: "cafe-aurora",
    createdByUserId: "core_user_a",
    status: "PROVISIONING",
    operationType: null,
    city: null,
    country: "BR",
    ...overrides,
  }
}

function harness(options: {
  existing?: Company | null
  createError?: Error
  provisionError?: Error
  activateError?: Error
  removeCompanyError?: Error
  removeTenantError?: Error
} = {}) {
  const calls: string[] = []
  const core: CoreAccessRepository = {
    async resolveUser() {
      calls.push("core.resolve-user")
      return { id: "core_user_a", name: "Ana", email: actor.email }
    },
    listSeumeiMemberships: async () => [],
    hasSeumeiMembership: async () => false,
    async provisionOwner(input) {
      calls.push(`core.provision:${input.tenantId}:${input.userId}`)
      if (options.provisionError) throw options.provisionError
    },
    async removeProvisionedTenant(input) {
      calls.push(`core.remove:${input.tenantId}:${input.userId}`)
      if (options.removeTenantError) throw options.removeTenantError
    },
  }

  const companies: CompanyRepository = {
    listVisibleByTenantIds: async () => [],
    findByIdForTenantIds: async () => null,
    async findByActorIdempotency(userId, key) {
      calls.push(`company.find:${userId}:${key}`)
      return options.existing ?? null
    },
    async createProvisioning(input) {
      calls.push(`company.create:${input.tenantId}:${input.createdByUserId}`)
      if (options.createError) throw options.createError
      return company({
        tenantId: input.tenantId,
        name: input.name,
        slug: input.slug,
        createdByUserId: input.createdByUserId,
      })
    },
    async markOnboarding(companyId, tenantId) {
      calls.push(`company.activate:${companyId}:${tenantId}`)
      if (options.activateError) throw options.activateError
      return company({ id: companyId, tenantId, status: "ONBOARDING" })
    },
    async markProvisioningFailed(companyId, tenantId) {
      calls.push(`company.failed:${companyId}:${tenantId}`)
    },
    async removeProvisioning(companyId, tenantId) {
      calls.push(`company.remove:${companyId}:${tenantId}`)
      if (options.removeCompanyError) throw options.removeCompanyError
    },
    readOnboarding: async () => null,
    saveOnboarding: async () => {
      throw new Error("unused")
    },
    completeOnboarding: async () => {
      throw new Error("unused")
    },
  }

  return { calls, core, companies }
}

describe("provisionCompany", () => {
  it("provisions Seumei before Core and activates onboarding", async () => {
    const { calls, core, companies } = harness()

    await expect(
      provisionCompany(
        { name: " Café Aurora ", idempotencyKey },
        actor,
        core,
        companies,
        { tenantId: () => "tenant_generated" },
      ),
    ).resolves.toMatchObject({
      tenantId: "tenant_generated",
      name: "Café Aurora",
      slug: "cafe-aurora",
      status: "ONBOARDING",
    })

    expect(calls).toEqual([
      "core.resolve-user",
      `company.find:core_user_a:${idempotencyKey}`,
      "company.create:tenant_generated:core_user_a",
      "core.provision:tenant_generated:core_user_a",
      "company.activate:company_a:tenant_generated",
    ])
  })

  it("returns an existing successful provisioning for the same actor and key", async () => {
    const existing = company({ status: "ONBOARDING" })
    const { calls, core, companies } = harness({ existing })

    await expect(
      provisionCompany(
        { name: "Outro nome", idempotencyKey },
        actor,
        core,
        companies,
        { tenantId: () => "must_not_run" },
      ),
    ).resolves.toBe(existing)
    expect(calls).toEqual([
      "core.resolve-user",
      `company.find:core_user_a:${idempotencyKey}`,
    ])
  })

  it("retries a retained failed provisioning with the same tenant", async () => {
    const existing = company({ status: "PROVISIONING_FAILED" })
    const { calls, core, companies } = harness({ existing })

    await expect(
      provisionCompany(
        { name: "Café Aurora", idempotencyKey },
        actor,
        core,
        companies,
        { tenantId: () => "must_not_run" },
      ),
    ).resolves.toMatchObject({ status: "ONBOARDING" })
    expect(calls).toContain("core.provision:tenant_generated:core_user_a")
  })

  it("rejects invalid idempotency before persistence", async () => {
    const { calls, core, companies } = harness()

    await expect(
      provisionCompany(
        { name: "Café Aurora", idempotencyKey: "browser-counter-1" },
        actor,
        core,
        companies,
        { tenantId: () => "tenant_generated" },
      ),
    ).rejects.toBeInstanceOf(InvalidIdempotencyKeyError)
    expect(calls).toEqual([])
  })

  it("preserves a real slug conflict", async () => {
    const conflict = new CompanySlugConflictError()
    const { core, companies } = harness({ createError: conflict })

    await expect(
      provisionCompany(
        { name: "Café Aurora", idempotencyKey },
        actor,
        core,
        companies,
        { tenantId: () => "tenant_generated" },
      ),
    ).rejects.toBe(conflict)
  })

  it("removes the provisional company when Core provisioning fails", async () => {
    const { calls, core, companies } = harness({
      provisionError: new Error("core offline"),
    })

    await expect(
      provisionCompany(
        { name: "Café Aurora", idempotencyKey },
        actor,
        core,
        companies,
        { tenantId: () => "tenant_generated" },
      ),
    ).rejects.toBeInstanceOf(CompanyProvisioningUnavailableError)
    expect(calls).toContain("company.remove:company_a:tenant_generated")
  })

  it("marks a retryable failure when compensation cannot remove the company", async () => {
    const { calls, core, companies } = harness({
      provisionError: new Error("core offline"),
      removeCompanyError: new Error("seumei offline"),
    })

    const result = provisionCompany(
      { name: "Café Aurora", idempotencyKey },
      actor,
      core,
      companies,
      { tenantId: () => "tenant_generated" },
    ).catch((error: unknown) => error)

    await expect(result).resolves.toMatchObject({
      name: "CompanyProvisioningUnavailableError",
      correlationId: expect.any(String),
    })
    expect(calls).toContain("company.failed:company_a:tenant_generated")
  })

  it("compensates Core when the final Seumei activation fails", async () => {
    const { calls, core, companies } = harness({
      activateError: new Error("seumei offline"),
    })

    await expect(
      provisionCompany(
        { name: "Café Aurora", idempotencyKey },
        actor,
        core,
        companies,
        { tenantId: () => "tenant_generated" },
      ),
    ).rejects.toBeInstanceOf(CompanyProvisioningUnavailableError)
    expect(calls).toContain("core.remove:tenant_generated:core_user_a")
    expect(calls).toContain("company.remove:company_a:tenant_generated")
  })
})
