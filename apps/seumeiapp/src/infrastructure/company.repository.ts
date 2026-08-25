import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import { OnboardingConflictError } from "../application/company-onboarding"
import { CompanySlugConflictError } from "../application/provision-company"
import type { Company, CompanyOnboarding } from "../domain/company"
import type { CompanyRepository } from "../domain/repositories/company-repository"

type CompanyRow = {
  id: string
  tenantId: string
  name: string
  slug: string
  createdByUserId: string
  status: string
  operationType: string | null
  city: string | null
  country: string
}

type OnboardingRow = {
  companyId: string
  tenantId: string
  currentStep: string
  version: number
  draftName: string
  draftSlug: string
  draftOperationType: string | null
  draftCity: string | null
  draftCountry: string
  draftCurrency: string
  completedSteps: string[]
  completedAt: Date | null
}

export class CompanyRecordNotFoundError extends Error {
  constructor() {
    super("O registro tenant-scoped não foi localizado")
    this.name = "CompanyRecordNotFoundError"
  }
}

function toCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    slug: row.slug,
    createdByUserId: row.createdByUserId,
    status: row.status as Company["status"],
    operationType: row.operationType as Company["operationType"],
    city: row.city,
    country: row.country,
  }
}

function toOnboarding(row: OnboardingRow): CompanyOnboarding {
  return {
    companyId: row.companyId,
    tenantId: row.tenantId,
    currentStep: row.currentStep as CompanyOnboarding["currentStep"],
    version: row.version,
    draftName: row.draftName,
    draftSlug: row.draftSlug,
    draftOperationType:
      row.draftOperationType as CompanyOnboarding["draftOperationType"],
    draftCity: row.draftCity,
    draftCountry: row.draftCountry,
    draftCurrency: row.draftCurrency as CompanyOnboarding["draftCurrency"],
    completedSteps: row.completedSteps as CompanyOnboarding["completedSteps"],
    completedAt: row.completedAt?.toISOString() ?? null,
  }
}

function isUniqueConstraint(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  )
}

export function createCompanyRepository(
  db: SeumeiPrismaClient,
): CompanyRepository {
  return {
    async listVisibleByTenantIds(tenantIds) {
      if (tenantIds.length === 0) return []
      const rows = await db.company.findMany({
        where: {
          tenantId: { in: [...tenantIds] },
          status: { in: ["ONBOARDING", "ACTIVE"] },
        },
        orderBy: { createdAt: "asc" },
      })
      return rows.map(toCompany)
    },

    async findByIdForTenantIds(companyId, tenantIds) {
      if (tenantIds.length === 0) return null
      const row = await db.company.findFirst({
        where: {
          id: companyId,
          tenantId: { in: [...tenantIds] },
          status: { in: ["ONBOARDING", "ACTIVE"] },
        },
      })
      return row ? toCompany(row) : null
    },

    async findByActorIdempotency(userId, key) {
      const row = await db.company.findUnique({
        where: {
          createdByUserId_idempotencyKey: {
            createdByUserId: userId,
            idempotencyKey: key,
          },
        },
      })
      return row ? toCompany(row) : null
    },

    async createProvisioning(input) {
      try {
        return await db.$transaction(async (tx) => {
          const row = await tx.company.create({
            data: {
              tenantId: input.tenantId,
              name: input.name,
              slug: input.slug,
              createdByUserId: input.createdByUserId,
              idempotencyKey: input.idempotencyKey,
              onboarding: {
                create: {
                  tenantId: input.tenantId,
                  draftName: input.name,
                  draftSlug: input.slug,
                  completedSteps: [],
                },
              },
            },
          })
          await tx.seumeiPreference.upsert({
            where: { tenantId: input.tenantId },
            create: { tenantId: input.tenantId },
            update: {},
          })
          return toCompany(row)
        })
      } catch (error) {
        if (isUniqueConstraint(error)) throw new CompanySlugConflictError()
        throw error
      }
    },

    async markOnboarding(companyId, tenantId) {
      const updated = await db.company.updateMany({
        where: {
          id: companyId,
          tenantId,
          status: { in: ["PROVISIONING", "PROVISIONING_FAILED"] },
        },
        data: { status: "ONBOARDING" },
      })
      if (updated.count !== 1) throw new CompanyRecordNotFoundError()
      const row = await db.company.findFirst({ where: { id: companyId, tenantId } })
      if (!row) throw new CompanyRecordNotFoundError()
      return toCompany(row)
    },

    async markProvisioningFailed(companyId, tenantId) {
      await db.company.updateMany({
        where: { id: companyId, tenantId },
        data: { status: "PROVISIONING_FAILED" },
      })
    },

    async removeProvisioning(companyId, tenantId) {
      const removed = await db.company.deleteMany({
        where: {
          id: companyId,
          tenantId,
          status: { in: ["PROVISIONING", "PROVISIONING_FAILED"] },
        },
      })
      if (removed.count !== 1) throw new CompanyRecordNotFoundError()
    },

    async readOnboarding(companyId, tenantId) {
      const row = await db.companyOnboarding.findFirst({
        where: { companyId, tenantId },
      })
      return row ? toOnboarding(row) : null
    },

    async saveOnboarding(input) {
      const updated = await db.companyOnboarding.updateMany({
        where: {
          companyId: input.companyId,
          tenantId: input.tenantId,
          version: input.expectedVersion,
        },
        data: {
          currentStep: input.next.currentStep,
          version: input.next.version,
          draftName: input.next.draftName,
          draftSlug: input.next.draftSlug,
          draftOperationType: input.next.draftOperationType,
          draftCity: input.next.draftCity,
          draftCountry: input.next.draftCountry,
          draftCurrency: input.next.draftCurrency,
          completedSteps: [...input.next.completedSteps],
          completedAt: input.next.completedAt
            ? new Date(input.next.completedAt)
            : null,
        },
      })
      if (updated.count !== 1) throw new OnboardingConflictError()
      const row = await db.companyOnboarding.findFirst({
        where: { companyId: input.companyId, tenantId: input.tenantId },
      })
      if (!row) throw new CompanyRecordNotFoundError()
      return toOnboarding(row)
    },

    async completeOnboarding(input) {
      return db.$transaction(async (tx) => {
        const completedAt = new Date()
        const progress = await tx.companyOnboarding.updateMany({
          where: {
            companyId: input.companyId,
            tenantId: input.tenantId,
            version: input.expectedVersion,
          },
          data: {
            currentStep: "COMPLETED",
            version: { increment: 1 },
            completedSteps: ["IDENTITY", "OPERATION", "PREFERENCES", "REVIEW"],
            completedAt,
          },
        })
        if (progress.count !== 1) throw new OnboardingConflictError()

        const company = await tx.company.updateMany({
          where: {
            id: input.companyId,
            tenantId: input.tenantId,
            status: "ONBOARDING",
          },
          data: {
            status: "ACTIVE",
            operationType: input.operationType,
            city: input.city,
            country: input.country,
          },
        })
        if (company.count !== 1) throw new CompanyRecordNotFoundError()

        await tx.seumeiPreference.upsert({
          where: { tenantId: input.tenantId },
          create: {
            tenantId: input.tenantId,
            preferredCurrency: input.currency,
          },
          update: { preferredCurrency: input.currency },
        })

        const companyRow = await tx.company.findFirst({
          where: { id: input.companyId, tenantId: input.tenantId },
        })
        const onboardingRow = await tx.companyOnboarding.findFirst({
          where: { companyId: input.companyId, tenantId: input.tenantId },
        })
        if (!companyRow || !onboardingRow) throw new CompanyRecordNotFoundError()
        return {
          company: toCompany(companyRow),
          onboarding: toOnboarding(onboardingRow),
        }
      })
    },
  }
}
