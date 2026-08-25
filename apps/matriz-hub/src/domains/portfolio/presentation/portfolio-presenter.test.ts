import { describe, expect, it } from "vitest"
import { toFederationPortfolioViewModel } from "./portfolio-presenter"

describe("federation portfolio presenter", () => {
  it("formats authorized company metrics and resolves Seumei entry URLs", () => {
    const vm = toFederationPortfolioViewModel({
      generatedAt: "2026-08-24T12:00:00.000Z",
      companies: [{ companyId: "company-a", name: "Galaxia Burger", slug: "galaxia-burger", status: "ACTIVE", role: "OWNER", todayRevenueCents: 2821040, liveOrderCount: 52, lowStockIngredientCount: 7, workspaceUrl: "/enter/company-a" }],
      totals: { companyCount: 1, todayRevenueCents: 2821040, liveOrderCount: 52, lowStockIngredientCount: 7 },
    }, "http://localhost:3008")

    expect(vm.summary).toEqual([
      { label: "Empresas autorizadas", value: "1" },
      { label: "Receita hoje", value: "R$ 28.210,40" },
      { label: "Pedidos em operação", value: "52" },
    ])
    expect(vm.companies[0]).toMatchObject({
      name: "Galaxia Burger",
      roleLabel: "Proprietário",
      revenue: "R$ 28.210,40",
      href: "http://localhost:3008/enter/company-a",
    })
  })

  it("returns an honest empty portfolio without synthetic company cards", () => {
    const vm = toFederationPortfolioViewModel({ generatedAt: "2026-08-24T12:00:00.000Z", companies: [], totals: { companyCount: 0, todayRevenueCents: 0, liveOrderCount: 0, lowStockIngredientCount: 0 } }, "http://localhost:3008")
    expect(vm.companies).toEqual([])
    expect(vm.summary[0]?.value).toBe("0")
  })
})
