import { describe, expect, it } from "vitest"
import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import { createPortfolioRepository } from "./portfolio.repository"

describe("createPortfolioRepository", () => {
  it("queries only explicit tenant IDs and returns honest zero commerce metrics before that schema exists", async () => {
    const calls: unknown[] = []
    const db = {
      company: {
        async findMany(args: unknown) {
          calls.push(args)
          return [{ id: "company-a", tenantId: "tenant-a", name: "Galaxia Burger", slug: "galaxia-burger", status: "ACTIVE" }]
        },
      },
    } as unknown as SeumeiPrismaClient

    await expect(createPortfolioRepository(db).listCompanySummaries(["tenant-a"])).resolves.toEqual([
      { companyId: "company-a", tenantId: "tenant-a", name: "Galaxia Burger", slug: "galaxia-burger", status: "ACTIVE", todayRevenueCents: 0, liveOrderCount: 0, lowStockIngredientCount: 0 },
    ])
    expect(calls).toEqual([{ where: { tenantId: { in: ["tenant-a"] }, status: { in: ["ONBOARDING", "ACTIVE"] } }, select: { id: true, tenantId: true, name: true, slug: true, status: true }, orderBy: { createdAt: "asc" } }])
  })

  it("returns without a database query for an empty tenant set", async () => {
    let called = false
    const db = { company: { async findMany() { called = true; return [] } } } as unknown as SeumeiPrismaClient
    await expect(createPortfolioRepository(db).listCompanySummaries([])).resolves.toEqual([])
    expect(called).toBe(false)
  })
})
