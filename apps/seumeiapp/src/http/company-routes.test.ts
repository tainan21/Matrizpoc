import { describe, expect, it, vi } from "vitest"
import { CompanyAccessDeniedError } from "../application/company-access"
import { OnboardingConflictError } from "../application/company-onboarding"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CompleteCoreAccessRepository } from "../domain/repositories/core-access-repository"
import {
  createCompanyHandler,
  listCompaniesHandler,
  saveOnboardingHandler,
  selectCompanyHandler,
  withAuthenticatedSession,
  type CompanyHttpServices,
} from "./company-handlers"

const actor = { sessionUserId: "session_a", name: "Ana", email: "ana@example.com" }
const company = { id: "company_a", tenantId: "tenant_a", name: "Empresa A", slug: "empresa-a", createdByUserId: "user_a", status: "ONBOARDING" as const, operationType: null, city: null, country: "BR" }

function services(overrides: Partial<CompanyHttpServices> = {}): CompanyHttpServices {
  return {
    core: {
      resolveUser: vi.fn().mockResolvedValue({ id: "user_a", name: "Ana", email: actor.email }),
      listSeumeiMemberships: vi.fn().mockResolvedValue([{ tenantId: "tenant_a", role: "OWNER" }]),
    } as unknown as CompleteCoreAccessRepository,
    companies: {
      listVisibleByTenantIds: vi.fn().mockResolvedValue([company]),
      findByIdForTenantIds: vi.fn().mockResolvedValue(company),
    } as unknown as CompanyRepository,
    selections: { record: vi.fn().mockResolvedValue(company) },
    ids: { tenantId: () => "tenant_new" },
    ...overrides,
  }
}

describe("company HTTP boundaries", () => {
  it("maps signed-out and unavailable session authority honestly", async () => {
    const action = vi.fn()
    await expect(withAuthenticatedSession({ kind: "signed-out" }, action)).resolves.toEqual({ status: 401, body: { error: "unauthorized" } })
    await expect(withAuthenticatedSession({ kind: "unavailable" }, action)).resolves.toEqual({ status: 503, body: { error: "session_unavailable" } })
    expect(action).not.toHaveBeenCalled()
  })

  it("lists only authorized presenter data without tenant identifiers", async () => {
    const result = await listCompaniesHandler(actor, services())
    expect(result.status).toBe(200)
    expect(result.body).toEqual({ companies: [{ id: "company_a", name: "Empresa A", slug: "empresa-a", statusLabel: "Configuração em andamento", actionLabel: "Continuar configuração" }] })
    expect(JSON.stringify(result.body)).not.toContain("tenant_a")
  })

  it("rejects tenant injection on company creation", async () => {
    const svc = services()
    const result = await createCompanyHandler(actor, { name: "Empresa", idempotencyKey: "6351ce18-e3fe-4c30-8c91-c3c380abc029", tenantId: "tenant_b" }, svc)
    expect(result).toEqual({ status: 400, body: { error: "invalid_request" } })
    expect(svc.core.resolveUser).not.toHaveBeenCalled()
  })

  it("returns a generic forbidden result for a foreign known company id", async () => {
    const svc = services({ companies: { findByIdForTenantIds: vi.fn().mockRejectedValue(new CompanyAccessDeniedError()) } as unknown as CompanyRepository })
    await expect(selectCompanyHandler(actor, { companyId: "company_b" }, svc)).resolves.toEqual({ status: 403, body: { error: "company_forbidden" } })
  })

  it("records the durable selection only after authorization", async () => {
    const record = vi.fn().mockResolvedValue(company)
    const result = await selectCompanyHandler(actor, { companyId: "company_a" }, services({ selections: { record } }))
    expect(result.status).toBe(200)
    expect(record).toHaveBeenCalledWith({ tenantId: "tenant_a", userId: "user_a", companyId: "company_a" })
  })

  it("maps optimistic onboarding conflicts to 409", async () => {
    const companies = {
      findByIdForTenantIds: vi.fn().mockResolvedValue(company),
      readOnboarding: vi.fn().mockRejectedValue(new OnboardingConflictError()),
    } as unknown as CompanyRepository
    const result = await saveOnboardingHandler(actor, "company_a", { expectedVersion: 1, step: "IDENTITY", values: { name: "Nova", slug: "nova" } }, services({ companies }))
    expect(result).toEqual({ status: 409, body: { error: "onboarding_conflict" } })
  })
})
