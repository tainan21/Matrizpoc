import type { SeumeiPortfolioV1 } from "@matriz/integration-api-contracts"
import type { CoreAccessRepository } from "../domain/repositories/core-access-repository"
import type { PortfolioRepository } from "../domain/repositories/portfolio-repository"
import type { SessionActor } from "../types/session-actor"

export async function readAuthorizedPortfolio(
  actor: SessionActor,
  core: CoreAccessRepository,
  portfolio: PortfolioRepository,
  now: () => Date = () => new Date(),
): Promise<SeumeiPortfolioV1> {
  const user = await core.resolveUser(actor)
  const memberships = await core.listSeumeiMemberships(user.id)
  const roleByTenant = new Map(memberships.map((membership) => [membership.tenantId, membership.role]))
  const rows = memberships.length === 0
    ? []
    : await portfolio.listCompanySummaries(memberships.map((membership) => membership.tenantId))
  const companies = rows
    .filter((row) => roleByTenant.has(row.tenantId))
    .map((row) => ({
      companyId: row.companyId,
      name: row.name,
      slug: row.slug,
      status: row.status,
      role: roleByTenant.get(row.tenantId)!,
      todayRevenueCents: row.todayRevenueCents,
      liveOrderCount: row.liveOrderCount,
      lowStockIngredientCount: row.lowStockIngredientCount,
      workspaceUrl: `/enter/${encodeURIComponent(row.companyId)}`,
    }))
  const totals = companies.reduce(
    (result, company) => ({
      companyCount: result.companyCount + 1,
      todayRevenueCents: result.todayRevenueCents + company.todayRevenueCents,
      liveOrderCount: result.liveOrderCount + company.liveOrderCount,
      lowStockIngredientCount: result.lowStockIngredientCount + company.lowStockIngredientCount,
    }),
    { companyCount: 0, todayRevenueCents: 0, liveOrderCount: 0, lowStockIngredientCount: 0 },
  )
  return { generatedAt: now().toISOString(), companies, totals }
}
