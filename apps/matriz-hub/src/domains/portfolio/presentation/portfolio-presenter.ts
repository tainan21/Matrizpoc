import type { SeumeiPortfolioV1 } from "@matriz/integration-api-contracts"

const roleLabels = { OWNER: "Proprietário", ADMIN: "Administrador", MEMBER: "Operação", VIEWER: "Leitura" } as const
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export interface FederationPortfolioViewModel {
  readonly summary: readonly { readonly label: string; readonly value: string }[]
  readonly companies: readonly {
    readonly id: string
    readonly name: string
    readonly slug: string
    readonly statusLabel: string
    readonly roleLabel: string
    readonly revenue: string
    readonly liveOrders: string
    readonly lowStock: string
    readonly href: string
  }[]
  readonly generatedAtLabel: string
}

export function toFederationPortfolioViewModel(portfolio: SeumeiPortfolioV1, seumeiOrigin: string): FederationPortfolioViewModel {
  return {
    summary: [
      { label: "Empresas autorizadas", value: String(portfolio.totals.companyCount) },
      { label: "Receita hoje", value: money.format(portfolio.totals.todayRevenueCents / 100) },
      { label: "Pedidos em operação", value: String(portfolio.totals.liveOrderCount) },
    ],
    companies: portfolio.companies.map((company) => ({
      id: company.companyId,
      name: company.name,
      slug: company.slug,
      statusLabel: company.status === "ACTIVE" ? "Ativa" : "Em configuração",
      roleLabel: roleLabels[company.role],
      revenue: money.format(company.todayRevenueCents / 100),
      liveOrders: String(company.liveOrderCount),
      lowStock: String(company.lowStockIngredientCount),
      href: new URL(company.workspaceUrl, seumeiOrigin).toString(),
    })),
    generatedAtLabel: new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(portfolio.generatedAt)),
  }
}
