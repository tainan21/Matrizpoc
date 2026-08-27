import { describe, expect, it } from "vitest"
import type { CoreAccessRepository } from "../domain/repositories/core-access-repository"
import type { PortfolioRepository } from "../domain/repositories/portfolio-repository"
import { readAuthorizedPortfolio } from "./read-portfolio"

const actor = { sessionUserId: "session-a", name: "Demo", email: "demo.global@matriz.local" }

function core(memberships: readonly { tenantId: string; role: "OWNER" | "MEMBER" }[]): CoreAccessRepository {
  return {
    resolveUser: async () => ({ id: "user-a", name: "Demo", email: actor.email }),
    listSeumeiMemberships: async () => memberships,
    hasSeumeiMembership: async () => false,
    provisionOwner: async () => undefined,
    provisionMembership: async () => undefined,
    removeProvisionedTenant: async () => undefined,
  }
}

describe("readAuthorizedPortfolio", () => {
  it("aggregates exactly the membership-derived companies", async () => {
    const requested: string[][] = []
    const portfolio: PortfolioRepository = {
      async listCompanySummaries(tenantIds) {
        requested.push([...tenantIds])
        return [
          { companyId: "galaxia", tenantId: "tenant-a", name: "Galaxia Burger", slug: "galaxia-burger", status: "ACTIVE", todayRevenueCents: 25000, liveOrderCount: 3, lowStockIngredientCount: 2 },
          { companyId: "sabor", tenantId: "tenant-b", name: "Sabor & Brasa", slug: "sabor-e-brasa", status: "ACTIVE", todayRevenueCents: 15000, liveOrderCount: 1, lowStockIngredientCount: 0 },
        ]
      },
    }

    await expect(readAuthorizedPortfolio(actor, core([
      { tenantId: "tenant-a", role: "OWNER" },
      { tenantId: "tenant-b", role: "OWNER" },
    ]), portfolio, () => new Date("2026-08-24T12:00:00.000Z"))).resolves.toEqual({
      generatedAt: "2026-08-24T12:00:00.000Z",
      companies: [
        { companyId: "galaxia", name: "Galaxia Burger", slug: "galaxia-burger", status: "ACTIVE", role: "OWNER", todayRevenueCents: 25000, liveOrderCount: 3, lowStockIngredientCount: 2, workspaceUrl: "/enter/galaxia" },
        { companyId: "sabor", name: "Sabor & Brasa", slug: "sabor-e-brasa", status: "ACTIVE", role: "OWNER", todayRevenueCents: 15000, liveOrderCount: 1, lowStockIngredientCount: 0, workspaceUrl: "/enter/sabor" },
      ],
      totals: { companyCount: 2, todayRevenueCents: 40000, liveOrderCount: 4, lowStockIngredientCount: 2 },
    })
    expect(requested).toEqual([["tenant-a", "tenant-b"]])
  })

  it("does not query globally when the actor has no Seumei membership", async () => {
    let called = false
    const portfolio: PortfolioRepository = {
      async listCompanySummaries() { called = true; return [] },
    }
    const result = await readAuthorizedPortfolio(actor, core([]), portfolio, () => new Date("2026-08-24T12:00:00.000Z"))
    expect(result.companies).toEqual([])
    expect(result.totals.companyCount).toBe(0)
    expect(called).toBe(false)
  })

  it("drops a repository row outside the membership tenant set as defense in depth", async () => {
    const portfolio: PortfolioRepository = {
      async listCompanySummaries() {
        return [{ companyId: "foreign", tenantId: "tenant-b", name: "Foreign", slug: "foreign", status: "ACTIVE", todayRevenueCents: 999, liveOrderCount: 9, lowStockIngredientCount: 9 }]
      },
    }
    const result = await readAuthorizedPortfolio(actor, core([{ tenantId: "tenant-a", role: "MEMBER" }]), portfolio, () => new Date("2026-08-24T12:00:00.000Z"))
    expect(result.companies).toEqual([])
    expect(result.totals.todayRevenueCents).toBe(0)
  })
})
