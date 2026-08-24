import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import type { PortfolioRepository } from "../domain/repositories/portfolio-repository"

export function createPortfolioRepository(db: SeumeiPrismaClient): PortfolioRepository {
  return {
    async listCompanySummaries(tenantIds) {
      if (tenantIds.length === 0) return []
      const companies = await db.company.findMany({
        where: { tenantId: { in: [...tenantIds] }, status: { in: ["ONBOARDING", "ACTIVE"] } },
        select: { id: true, tenantId: true, name: true, slug: true, status: true },
        orderBy: { createdAt: "asc" },
      })
      return companies.map((company) => ({
        companyId: company.id,
        tenantId: company.tenantId,
        name: company.name,
        slug: company.slug,
        status: company.status as "ONBOARDING" | "ACTIVE",
        todayRevenueCents: 0,
        liveOrderCount: 0,
        lowStockIngredientCount: 0,
      }))
    },
  }
}
