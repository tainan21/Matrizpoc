import { describe, expect, it } from "vitest"
import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import type { CompanyOnboarding } from "../domain/company"
import { OnboardingConflictError } from "../application/company-onboarding"
import { createCompanyRepository } from "./company.repository"

const companyRow = {
  id: "company_a",
  tenantId: "tenant_a",
  name: "Empresa A",
  slug: "empresa-a",
  createdByUserId: "user_a",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  status: "ONBOARDING",
  operationType: null,
  city: null,
  country: "BR",
  createdAt: new Date("2026-08-20T10:00:00.000Z"),
  updatedAt: new Date("2026-08-20T10:00:00.000Z"),
}

const onboardingRow = {
  id: "onboarding_a",
  companyId: "company_a",
  tenantId: "tenant_a",
  currentStep: "OPERATION",
  version: 3,
  draftName: "Empresa A",
  draftSlug: "empresa-a",
  draftOperationType: null,
  draftCity: null,
  draftCountry: "BR",
  draftCurrency: "BRL",
  completedSteps: ["IDENTITY"],
  startedAt: new Date("2026-08-20T10:00:00.000Z"),
  completedAt: null,
  updatedAt: new Date("2026-08-20T10:00:00.000Z"),
}

function seumeiClient() {
  const calls: Array<{ method: string; args: any }> = []
  let completed = false
  let saved = false
  const client: any = {
    company: {
      findMany: async (args: any) => {
        calls.push({ method: "company.findMany", args })
        return [companyRow]
      },
      findFirst: async (args: any) => {
        calls.push({ method: "company.findFirst", args })
        return completed
          ? { ...companyRow, status: "ACTIVE", operationType: "SERVICE", city: "Recife" }
          : companyRow
      },
      findUnique: async (args: any) => {
        calls.push({ method: "company.findUnique", args })
        return null
      },
      create: async (args: any) => {
        calls.push({ method: "company.create", args })
        return companyRow
      },
      updateMany: async (args: any) => {
        calls.push({ method: "company.updateMany", args })
        if (args.data.status === "ACTIVE") completed = true
        return { count: 1 }
      },
      deleteMany: async (args: any) => {
        calls.push({ method: "company.deleteMany", args })
        return { count: 1 }
      },
    },
    companyOnboarding: {
      findFirst: async (args: any) => {
        calls.push({ method: "onboarding.findFirst", args })
        if (completed) {
          return {
            ...onboardingRow,
            currentStep: "COMPLETED",
            version: 4,
            completedAt: new Date("2026-08-20T12:00:00.000Z"),
          }
        }
        return saved ? { ...onboardingRow, version: 4, currentStep: "PREFERENCES" } : onboardingRow
      },
      updateMany: async (args: any) => {
        calls.push({ method: "onboarding.updateMany", args })
        saved = true
        return { count: 1 }
      },
    },
    seumeiPreference: {
      upsert: async (args: any) => {
        calls.push({ method: "preference.upsert", args })
        return { tenantId: "tenant_a" }
      },
    },
  }
  client.$transaction = async (callback: (tx: typeof client) => Promise<unknown>) => {
    calls.push({ method: "$transaction", args: null })
    return callback(client)
  }
  return { db: client as SeumeiPrismaClient, calls }
}

function nextOnboarding(): CompanyOnboarding {
  return {
    companyId: "company_a",
    tenantId: "tenant_a",
    currentStep: "PREFERENCES",
    version: 4,
    draftName: "Empresa A",
    draftSlug: "empresa-a",
    draftOperationType: "SERVICE",
    draftCity: "Recife",
    draftCountry: "BR",
    draftCurrency: "BRL",
    completedSteps: ["IDENTITY", "OPERATION"],
    completedAt: null,
  }
}

describe("createCompanyRepository", () => {
  it("lists companies only from the supplied tenant membership set", async () => {
    const { db, calls } = seumeiClient()
    const repository = createCompanyRepository(db)

    await repository.listVisibleByTenantIds(["tenant_a"])

    expect(calls[0]).toEqual({
      method: "company.findMany",
      args: {
        where: {
          tenantId: { in: ["tenant_a"] },
          status: { in: ["ONBOARDING", "ACTIVE"] },
        },
        orderBy: { createdAt: "asc" },
      },
    })
  })

  it("scopes a known company ID by the authorized tenant set", async () => {
    const { db, calls } = seumeiClient()
    const repository = createCompanyRepository(db)

    await repository.findByIdForTenantIds("company_a", ["tenant_a"])

    expect(calls[0]).toMatchObject({
      method: "company.findFirst",
      args: { where: { id: "company_a", tenantId: { in: ["tenant_a"] } } },
    })
  })

  it("creates company, onboarding and minimum preference in one Seumei transaction", async () => {
    const { db, calls } = seumeiClient()
    const repository = createCompanyRepository(db)

    await repository.createProvisioning({
      tenantId: "tenant_a",
      name: "Empresa A",
      slug: "empresa-a",
      createdByUserId: "user_a",
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
    })

    expect(calls.map(({ method }) => method)).toEqual([
      "$transaction",
      "company.create",
      "preference.upsert",
    ])
    expect(calls[1]).toMatchObject({
      args: {
        data: {
          tenantId: "tenant_a",
          onboarding: { create: { tenantId: "tenant_a", draftName: "Empresa A" } },
        },
      },
    })
  })

  it("uses company and tenant in optimistic onboarding updates", async () => {
    const { db, calls } = seumeiClient()
    const repository = createCompanyRepository(db)

    await repository.saveOnboarding({
      companyId: "company_a",
      tenantId: "tenant_a",
      expectedVersion: 3,
      next: nextOnboarding(),
    })

    expect(calls[0]).toEqual({
      method: "onboarding.updateMany",
      args: expect.objectContaining({
        where: { companyId: "company_a", tenantId: "tenant_a", version: 3 },
      }),
    })
  })

  it("maps an optimistic miss to an onboarding conflict", async () => {
    const { db } = seumeiClient()
    ;(db.companyOnboarding.updateMany as any) = async () => ({ count: 0 })
    const repository = createCompanyRepository(db)

    await expect(
      repository.saveOnboarding({
        companyId: "company_a",
        tenantId: "tenant_a",
        expectedVersion: 3,
        next: nextOnboarding(),
      }),
    ).rejects.toBeInstanceOf(OnboardingConflictError)
  })

  it("completes company, onboarding and preference in one scoped transaction", async () => {
    const { db, calls } = seumeiClient()
    const repository = createCompanyRepository(db)

    await repository.completeOnboarding({
      companyId: "company_a",
      tenantId: "tenant_a",
      expectedVersion: 3,
      operationType: "SERVICE",
      city: "Recife",
      country: "BR",
      currency: "BRL",
    })

    expect(calls.map(({ method }) => method)).toEqual([
      "$transaction",
      "onboarding.updateMany",
      "company.updateMany",
      "preference.upsert",
      "company.findFirst",
      "onboarding.findFirst",
    ])
    expect(calls[2]).toMatchObject({
      args: { where: { id: "company_a", tenantId: "tenant_a", status: "ONBOARDING" } },
    })
  })
})
