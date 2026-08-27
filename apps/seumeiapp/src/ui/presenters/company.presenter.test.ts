import { describe, expect, it } from "vitest"
import type { Company, CompanyOnboarding } from "../../domain/company"
import {
  toCompanyChoiceViewModel,
  toOnboardingViewModel,
  toWorkspaceViewModel,
} from "./company.presenter"

const company: Company = {
  id: "company_1",
  tenantId: "tenant_secret",
  name: "Café Aurora",
  slug: "cafe-aurora",
  createdByUserId: "user_secret",
  status: "ONBOARDING",
  operationType: null,
  city: null,
  country: "BR",
}

const onboarding: CompanyOnboarding = {
  companyId: company.id,
  tenantId: company.tenantId,
  currentStep: "OPERATION",
  version: 2,
  draftName: company.name,
  draftSlug: company.slug,
  draftOperationType: null,
  draftCity: null,
  draftCountry: "BR",
  draftCurrency: "BRL",
  completedSteps: ["IDENTITY"],
  completedAt: null,
}

describe("company presenters", () => {
  it("presents a company choice without tenant or audit identifiers", () => {
    const viewModel = toCompanyChoiceViewModel(company)

    expect(viewModel).toEqual({
      id: "company_1",
      name: "Café Aurora",
      slug: "cafe-aurora",
      statusLabel: "Configuração em andamento",
      actionLabel: "Continuar configuração",
    })
    expect(viewModel).not.toHaveProperty("tenantId")
    expect(viewModel).not.toHaveProperty("createdByUserId")
    expect(viewModel).not.toHaveProperty("idempotencyKey")
  })

  it("presents resumable onboarding progress", () => {
    expect(toOnboardingViewModel(company, onboarding)).toMatchObject({
      companyName: "Café Aurora",
      currentStep: "OPERATION",
      currentStepLabel: "Operação",
      version: 2,
      progressPercent: 25,
    })
  })

  it("presents the active workspace without exposing tenant authority", () => {
    const activeCompany = {
      ...company,
      status: "ACTIVE" as const,
      operationType: "ONLINE_STORE" as const,
      city: "Recife",
    }
    const viewModel = toWorkspaceViewModel(activeCompany)

    expect(viewModel).toEqual({
      companyName: "Café Aurora",
      companySlug: "cafe-aurora",
      operationLabel: "Loja online",
      locationLabel: "Recife · BR",
    })
    expect(viewModel).not.toHaveProperty("tenantId")
  })
})
