import { describe, expect, it, vi } from "vitest"
import { CompanyAccessDeniedError } from "../application/company-access"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CoreAccessRepository } from "../domain/repositories/core-access-repository"
import { resolveActiveCompanyContext } from "./active-company"

const actor = { sessionUserId: "session_a", name: "Ana", email: "ana@example.com" }
const company = { id: "company_a", tenantId: "tenant_a", name: "A", slug: "a", createdByUserId: "user_a", status: "ONBOARDING" as const, operationType: null, city: null, country: "BR" }

describe("resolveActiveCompanyContext", () => {
  it("resolves the cookie preference through persistent membership authority", async () => {
    const core = { resolveUser: vi.fn().mockResolvedValue({ id: "user_a", name: "Ana", email: actor.email }), listSeumeiMemberships: vi.fn().mockResolvedValue([{ tenantId: "tenant_a", role: "OWNER" }]) } as unknown as CoreAccessRepository
    const companies = { findByIdForTenantIds: vi.fn().mockResolvedValue(company) } as unknown as CompanyRepository
    await expect(resolveActiveCompanyContext(actor, "company_a", core, companies)).resolves.toEqual({ userId: "user_a", role: "OWNER", company })
    expect(companies.findByIdForTenantIds).toHaveBeenCalledWith("company_a", ["tenant_a"])
  })

  it("denies a known company id when the actor has no membership", async () => {
    const core = { resolveUser: vi.fn().mockResolvedValue({ id: "user_a" }), listSeumeiMemberships: vi.fn().mockResolvedValue([]) } as unknown as CoreAccessRepository
    const companies = { findByIdForTenantIds: vi.fn() } as unknown as CompanyRepository
    await expect(resolveActiveCompanyContext(actor, "company_b", core, companies)).rejects.toBeInstanceOf(CompanyAccessDeniedError)
    expect(companies.findByIdForTenantIds).not.toHaveBeenCalled()
  })
})
