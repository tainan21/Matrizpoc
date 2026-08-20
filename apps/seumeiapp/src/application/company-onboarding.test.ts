import { describe, expect, it } from "vitest"
import type { Company, CompanyOnboarding, CompanyRole } from "../domain/company"
import type {
  CompanyRepository,
  CompleteOnboardingRecord,
  CreateProvisioningRecord,
  SaveOnboardingRecord,
} from "../domain/repositories/company-repository"
import {
  CompanyCapabilityDeniedError,
  OnboardingConflictError,
  OnboardingNotFoundError,
  WorkspaceNotReadyError,
  completeCompanyOnboarding,
  readCompanyOnboarding,
  requireWorkspaceCompany,
  saveCompanyOnboardingStep,
  type AuthorizedCompanyContext,
} from "./company-onboarding"

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: "company_a",
    tenantId: "tenant_a",
    name: "Café Aurora",
    slug: "cafe-aurora",
    createdByUserId: "user_a",
    status: "ONBOARDING",
    operationType: null,
    city: null,
    country: "BR",
    ...overrides,
  }
}

function onboarding(
  overrides: Partial<CompanyOnboarding> = {},
): CompanyOnboarding {
  return {
    companyId: "company_a",
    tenantId: "tenant_a",
    currentStep: "OPERATION",
    version: 3,
    draftName: "Café Aurora",
    draftSlug: "cafe-aurora",
    draftOperationType: null,
    draftCity: null,
    draftCountry: "BR",
    draftCurrency: "BRL",
    completedSteps: ["IDENTITY"],
    completedAt: null,
    ...overrides,
  }
}

function context(
  role: CompanyRole = "OWNER",
  selectedCompany: Company = company(),
): AuthorizedCompanyContext {
  return { userId: "user_a", role, company: selectedCompany }
}

function repository(initial: CompanyOnboarding | null = onboarding()) {
  let current = initial
  const reads: Array<{ companyId: string; tenantId: string }> = []
  const saves: SaveOnboardingRecord[] = []
  const completions: CompleteOnboardingRecord[] = []

  const repo: CompanyRepository = {
    listVisibleByTenantIds: async () => [],
    findByIdForTenantIds: async () => null,
    findByActorIdempotency: async () => null,
    createProvisioning: async (_input: CreateProvisioningRecord) => company(),
    markOnboarding: async () => company(),
    markProvisioningFailed: async () => undefined,
    removeProvisioning: async () => undefined,
    async readOnboarding(companyId, tenantId) {
      reads.push({ companyId, tenantId })
      return current
    },
    async saveOnboarding(input) {
      saves.push(input)
      if (!current || input.expectedVersion !== current.version) {
        throw new OnboardingConflictError()
      }
      current = input.next
      return current
    },
    async completeOnboarding(input) {
      completions.push(input)
      if (!current || input.expectedVersion !== current.version) {
        throw new OnboardingConflictError()
      }
      current = {
        ...current,
        currentStep: "COMPLETED",
        version: current.version + 1,
        completedSteps: ["IDENTITY", "OPERATION", "PREFERENCES", "REVIEW"],
        completedAt: "2026-08-20T12:00:00.000Z",
      }
      return {
        company: company({
          status: "ACTIVE",
          operationType: input.operationType,
          city: input.city,
          country: input.country,
        }),
        onboarding: current,
      }
    },
  }

  return { repo, reads, saves, completions, current: () => current }
}

describe("company onboarding", () => {
  it("resumes the persisted step and version with tenant scope", async () => {
    const { repo, reads } = repository(onboarding({ currentStep: "OPERATION", version: 3 }))

    await expect(readCompanyOnboarding(context(), repo)).resolves.toMatchObject({
      currentStep: "OPERATION",
      version: 3,
    })
    expect(reads).toEqual([{ companyId: "company_a", tenantId: "tenant_a" }])
  })

  it("reports missing persisted progress honestly", async () => {
    await expect(readCompanyOnboarding(context(), repository(null).repo)).rejects.toBeInstanceOf(
      OnboardingNotFoundError,
    )
  })

  it("rejects a stale expected version without overwriting progress", async () => {
    const { repo, saves } = repository(onboarding({ version: 3 }))

    await expect(
      saveCompanyOnboardingStep(
        context(),
        {
          expectedVersion: 2,
          step: "OPERATION",
          values: {
            operationType: "ONLINE_STORE",
            city: "Recife",
            country: "BR",
          },
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(OnboardingConflictError)
    expect(saves).toEqual([])
  })

  it("persists only the fields allowed for an operation step", async () => {
    const { repo, current, saves } = repository(onboarding())

    await saveCompanyOnboardingStep(
      context(),
      {
        expectedVersion: 3,
        step: "OPERATION",
        values: {
          operationType: "HYBRID",
          city: " São Paulo ",
          country: "br",
        },
      },
      repo,
    )

    expect(current()).toMatchObject({
      currentStep: "PREFERENCES",
      version: 4,
      draftOperationType: "HYBRID",
      draftCity: "São Paulo",
      draftCountry: "BR",
      completedSteps: ["IDENTITY", "OPERATION"],
    })
    expect(saves[0]).toMatchObject({ companyId: "company_a", tenantId: "tenant_a" })
  })

  it("denies onboarding mutation without owner or admin capability", async () => {
    const { repo, saves } = repository()

    await expect(
      saveCompanyOnboardingStep(
        context("MEMBER"),
        {
          expectedVersion: 3,
          step: "PREFERENCES",
          values: { currency: "BRL" },
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(CompanyCapabilityDeniedError)
    expect(saves).toEqual([])
  })

  it("rejects completion while required persisted values are missing", async () => {
    const { repo, completions } = repository(onboarding())

    await expect(
      completeCompanyOnboarding(context(), { expectedVersion: 3 }, repo),
    ).rejects.toMatchObject({
      name: "IncompleteOnboardingError",
      fields: ["operationType", "city"],
    })
    expect(completions).toEqual([])
  })

  it("atomically completes valid onboarding data", async () => {
    const completeDraft = onboarding({
      currentStep: "REVIEW",
      version: 6,
      draftOperationType: "ONLINE_STORE",
      draftCity: "Recife",
      completedSteps: ["IDENTITY", "OPERATION", "PREFERENCES"],
    })
    const { repo, completions } = repository(completeDraft)

    await expect(
      completeCompanyOnboarding(context(), { expectedVersion: 6 }, repo),
    ).resolves.toMatchObject({
      company: { status: "ACTIVE", operationType: "ONLINE_STORE", city: "Recife" },
      onboarding: { currentStep: "COMPLETED", completedAt: expect.any(String) },
    })
    expect(completions).toEqual([
      {
        companyId: "company_a",
        tenantId: "tenant_a",
        expectedVersion: 6,
        operationType: "ONLINE_STORE",
        city: "Recife",
        country: "BR",
        currency: "BRL",
      },
    ])
  })

  it("treats repeated completion as idempotent", async () => {
    const active = company({
      status: "ACTIVE",
      operationType: "SERVICE",
      city: "Salvador",
    })
    const completed = onboarding({
      currentStep: "COMPLETED",
      version: 8,
      draftOperationType: "SERVICE",
      draftCity: "Salvador",
      completedAt: "2026-08-20T12:00:00.000Z",
    })
    const { repo, completions } = repository(completed)

    await expect(
      completeCompanyOnboarding(context("OWNER", active), { expectedVersion: 8 }, repo),
    ).resolves.toEqual({ company: active, onboarding: completed })
    expect(completions).toEqual([])
  })

  it("denies workspace entry before completion", async () => {
    await expect(requireWorkspaceCompany(context(), repository().repo)).rejects.toBeInstanceOf(
      WorkspaceNotReadyError,
    )
  })

  it("allows workspace entry after the same tenant onboarding completes", async () => {
    const active = company({ status: "ACTIVE", operationType: "SERVICE", city: "Salvador" })
    const completed = onboarding({
      currentStep: "COMPLETED",
      completedAt: "2026-08-20T12:00:00.000Z",
    })

    await expect(
      requireWorkspaceCompany(context("OWNER", active), repository(completed).repo),
    ).resolves.toBe(active)
  })
})
