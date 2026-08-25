import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import type { PortfolioRepository } from "../domain/repositories/portfolio-repository"

export function createPortfolioRepository(db: SeumeiPrismaClient): PortfolioRepository {
  return {
    async listCompanySummaries(tenantIds) {
      if (tenantIds.length === 0) return []
      const explicitTenants = [...tenantIds]
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
      const [companies, orders, inventories] = await Promise.all([
        db.company.findMany({ where: { tenantId: { in: explicitTenants }, status: { in: ["ONBOARDING", "ACTIVE"] } }, select: { id: true, tenantId: true, name: true, slug: true, status: true }, orderBy: { createdAt: "asc" } }),
        db.commerceOrder.findMany({ where: { tenantId: { in: explicitTenants }, createdAt: { gte: startOfDay } }, select: { tenantId: true, totalCents: true, status: true } }),
        db.ingredientInventory.findMany({ where: { tenantId: { in: explicitTenants } }, select: { tenantId: true, balance: true, lowStockThreshold: true } }),
      ])
      return companies.map((company) => ({
        companyId: company.id,
        tenantId: company.tenantId,
        name: company.name,
        slug: company.slug,
        status: company.status as "ONBOARDING" | "ACTIVE",
        todayRevenueCents: orders.filter((order) => order.tenantId === company.tenantId && order.status !== "CANCELLED").reduce((sum, order) => sum + order.totalCents, 0),
        liveOrderCount: orders.filter((order) => order.tenantId === company.tenantId && !["COMPLETED", "CANCELLED"].includes(order.status)).length,
        lowStockIngredientCount: inventories.filter((inventory) => inventory.tenantId === company.tenantId && inventory.balance <= inventory.lowStockThreshold).length,
      }))
    },
  }
}
