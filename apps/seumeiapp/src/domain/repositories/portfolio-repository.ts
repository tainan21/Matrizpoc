export interface PortfolioCompanySummaryRecord {
  readonly companyId: string
  readonly tenantId: string
  readonly name: string
  readonly slug: string
  readonly status: "ONBOARDING" | "ACTIVE"
  readonly todayRevenueCents: number
  readonly liveOrderCount: number
  readonly lowStockIngredientCount: number
}

export interface PortfolioRepository {
  listCompanySummaries(tenantIds: readonly string[]): Promise<readonly PortfolioCompanySummaryRecord[]>
}
