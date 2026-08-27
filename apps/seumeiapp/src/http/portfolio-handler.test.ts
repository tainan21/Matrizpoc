import { describe, expect, it } from "vitest"
import type { PortfolioHttpServices } from "./portfolio-handler"
import { readPortfolioHandler } from "./portfolio-handler"

const actor = { sessionUserId: "session-a", name: "Demo", email: "demo.global@matriz.local" }

function services(tenantIds: readonly string[]): PortfolioHttpServices {
  return {
    core: {
      resolveUser: async () => ({ id: "user-a", name: "Demo", email: actor.email }),
      listSeumeiMemberships: async () => tenantIds.map((tenantId) => ({ tenantId, role: "OWNER" as const })),
      hasSeumeiMembership: async () => false,
      provisionOwner: async () => undefined,
      provisionMembership: async () => undefined,
      removeProvisionedTenant: async () => undefined,
    },
    portfolio: {
      listCompanySummaries: async (authorizedTenantIds) => authorizedTenantIds.map((tenantId) => ({
        companyId: `company-${tenantId}`,
        tenantId,
        name: tenantId === "tenant-a" ? "Galaxia Burger" : "Sabor & Brasa",
        slug: tenantId === "tenant-a" ? "galaxia-burger" : "sabor-e-brasa",
        status: "ACTIVE" as const,
        todayRevenueCents: 0,
        liveOrderCount: 0,
        lowStockIngredientCount: 0,
      })),
    },
  }
}

describe("portfolio HTTP boundary", () => {
  it("returns only actor-authorized companies", async () => {
    const result = await readPortfolioHandler(actor, services(["tenant-a"]), () => new Date("2026-08-24T12:00:00.000Z"))
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      companies: [{ companyId: "company-tenant-a", name: "Galaxia Burger", role: "OWNER" }],
      totals: { companyCount: 1 },
    })
    expect(JSON.stringify(result.body)).not.toContain("Sabor & Brasa")
  })

  it("does not accept browser tenant authority", async () => {
    const result = await readPortfolioHandler(actor, services(["tenant-a"]), () => new Date(), { tenantId: "tenant-b" })
    expect(result).toEqual({ status: 400, body: { error: "invalid_request" } })
  })

  it("returns a sanitized unavailable result when persistence fails", async () => {
    const ready = services(["tenant-a"])
    const failing: PortfolioHttpServices = {
      ...ready,
      portfolio: { listCompanySummaries: async () => { throw new Error("postgres secret") } },
    }
    await expect(readPortfolioHandler(actor, failing)).resolves.toEqual({
      status: 503,
      body: { error: "portfolio_unavailable" },
    })
  })
})
