import { describe, expect, it } from "vitest"
import {
  InvalidCompanyInputError,
  normalizeCompanyInput,
  validateOnboardingDraft,
  type CompanyOnboarding,
} from "./company"

function onboarding(
  overrides: Partial<CompanyOnboarding> = {},
): CompanyOnboarding {
  return {
    companyId: "company_1",
    tenantId: "tenant_1",
    currentStep: "REVIEW",
    version: 4,
    draftName: "Café Aurora",
    draftSlug: "cafe-aurora",
    draftOperationType: "ONLINE_STORE",
    draftCity: "Recife",
    draftCountry: "BR",
    draftCurrency: "BRL",
    completedSteps: ["IDENTITY", "OPERATION", "PREFERENCES"],
    completedAt: null,
    ...overrides,
  }
}

describe("company domain", () => {
  it("normalizes company identity without accepting tenant authority", () => {
    expect(
      normalizeCompanyInput({ name: "  Café   Aurora  ", slug: " Café Aurora " }),
    ).toEqual({ name: "Café Aurora", slug: "cafe-aurora" })
  })

  it("derives a stable slug from the company name", () => {
    expect(normalizeCompanyInput({ name: "Ação & Afeto" })).toEqual({
      name: "Ação & Afeto",
      slug: "acao-afeto",
    })
  })

  it.each([
    { name: " ", slug: "valid" },
    { name: "A", slug: "valid" },
    { name: "Empresa", slug: "x" },
    { name: "Empresa", slug: "---" },
  ])("rejects invalid company identity %#", (input) => {
    expect(() => normalizeCompanyInput(input)).toThrowError(
      InvalidCompanyInputError,
    )
  })

  it("reports fields missing from a resumable onboarding draft", () => {
    expect(
      validateOnboardingDraft(
        onboarding({
          draftOperationType: null,
          draftCity: null,
          draftCurrency: "" as "BRL",
        }),
      ),
    ).toEqual(["operationType", "city", "currency"])
  })

  it("accepts a complete onboarding draft", () => {
    expect(validateOnboardingDraft(onboarding())).toEqual([])
  })
})
