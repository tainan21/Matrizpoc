import { withTenantContext } from "@matriz/platform-db/tenant-context"
import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import type { Company } from "../domain/company"

export interface CompanySelectionRepository {
  record(input: { tenantId: string; userId: string; companyId: string }): Promise<Company>
}

export function createCompanySelectionRepository(db: SeumeiPrismaClient): CompanySelectionRepository {
  return {
    record(input) {
      return withTenantContext(db, input.tenantId, async (tx) => {
        const company = await tx.company.findFirst({
          where: { id: input.companyId, tenantId: input.tenantId, status: { in: ["ONBOARDING", "ACTIVE"] } },
        })
        if (!company) throw new Error("Company is not authorized in the active tenant")
        await tx.seumeiCompanySelection.upsert({
          where: { tenantId_userId: { tenantId: input.tenantId, userId: input.userId } },
          create: { tenantId: input.tenantId, userId: input.userId, companyId: input.companyId },
          update: { companyId: input.companyId, selectedAt: new Date() },
        })
        const deduplicationKey = `selection:${input.tenantId}:${input.userId}:${input.companyId}`
        await tx.seumeiOutboxEvent.upsert({
          where: { deduplicationKey },
          create: {
            tenantId: input.tenantId,
            eventName: "seumei.establishment.selected",
            eventVersion: "v1",
            deduplicationKey,
            payloadJson: { establishmentId: company.id, name: company.name },
          },
          update: {},
        })
        return {
          id: company.id,
          tenantId: company.tenantId,
          name: company.name,
          slug: company.slug,
          createdByUserId: company.createdByUserId,
          status: company.status,
          operationType: company.operationType,
          city: company.city,
          country: company.country,
        }
      })
    },
  }
}
