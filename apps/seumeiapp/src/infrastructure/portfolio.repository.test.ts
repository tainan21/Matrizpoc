import { describe, expect, it } from "vitest"
import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import { createPortfolioRepository } from "./portfolio.repository"

describe("createPortfolioRepository", () => {
  it("queries only explicit tenant IDs and returns persisted commerce metrics", async () => {
    const calls: unknown[] = []
    const db = {
      company: {
        async findMany(args: unknown) {
          calls.push(args)
          return [{ id: "company-a", tenantId: "tenant-a", name: "Galaxia Burger", slug: "galaxia-burger", status: "ACTIVE" }]
        },
      },
      commerceOrder: { async findMany(args: unknown) { calls.push(args); return [{ tenantId: "tenant-a", totalCents: 5980, status: "PLACED" }] } },
      ingredientInventory: { async findMany(args: unknown) { calls.push(args); return [{ tenantId: "tenant-a", balance: 5, lowStockThreshold: 10 }] } },
    } as unknown as SeumeiPrismaClient

    await expect(createPortfolioRepository(db).listCompanySummaries(["tenant-a"])).resolves.toEqual([
      { companyId: "company-a", tenantId: "tenant-a", name: "Galaxia Burger", slug: "galaxia-burger", status: "ACTIVE", todayRevenueCents: 5980, liveOrderCount: 1, lowStockIngredientCount: 1 },
    ])
    expect(JSON.stringify(calls)).not.toContain("tenant-b")
  })

  it("returns without a database query for an empty tenant set", async () => {
    let called = false
    const db = { company: { async findMany() { called = true; return [] } } } as unknown as SeumeiPrismaClient
    await expect(createPortfolioRepository(db).listCompanySummaries([])).resolves.toEqual([])
    expect(called).toBe(false)
  })
})
