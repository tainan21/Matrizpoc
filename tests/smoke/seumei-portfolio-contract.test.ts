import { describe, expect, it } from "vitest"
import { seumeiPortfolioV1Schema } from "@matriz/integration-api-contracts"

const validPortfolio = {
  generatedAt: "2026-08-24T12:00:00.000Z",
  companies: [
    {
      companyId: "company-galaxia",
      name: "Galaxia Burger",
      slug: "galaxia-burger",
      status: "ACTIVE",
      role: "OWNER",
      todayRevenueCents: 12990,
      liveOrderCount: 2,
      lowStockIngredientCount: 1,
      workspaceUrl: "/workspace?company=company-galaxia",
    },
  ],
  totals: {
    companyCount: 1,
    todayRevenueCents: 12990,
    liveOrderCount: 2,
    lowStockIngredientCount: 1,
  },
} as const

describe("Seumei portfolio V1 contract", () => {
  it("accepts a literal authorized portfolio payload", () => {
    expect(seumeiPortfolioV1Schema.parse(validPortfolio)).toEqual(validPortfolio)
  })

  it.each([
    ["unknown role", { ...validPortfolio, companies: [{ ...validPortfolio.companies[0], role: "GLOBAL_ADMIN" }] }],
    ["negative metric", { ...validPortfolio, totals: { ...validPortfolio.totals, liveOrderCount: -1 } }],
    ["external workspace", { ...validPortfolio, companies: [{ ...validPortfolio.companies[0], workspaceUrl: "https://evil.example/workspace" }] }],
  ])("rejects %s", (_name, payload) => {
    expect(seumeiPortfolioV1Schema.safeParse(payload).success).toBe(false)
  })
})
