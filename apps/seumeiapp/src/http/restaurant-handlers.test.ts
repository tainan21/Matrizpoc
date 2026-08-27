import { describe, expect, it, vi } from "vitest"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CompleteCoreAccessRepository } from "../domain/repositories/core-access-repository"
import type { RestaurantRepository } from "../domain/repositories/restaurant-repository"
import { createIngredientHandler, createStockMovementHandler, readRecipeHandler } from "./restaurant-handlers"

const actor = { sessionUserId: "session-a", name: "Ana", email: "ana@example.com" }
const company = { id: "company-a", tenantId: "tenant-a", name: "Galaxia", slug: "galaxia", createdByUserId: "user-a", status: "ACTIVE" as const, operationType: "PHYSICAL_STORE" as const, city: "SP", country: "BR" }

function services(role: "OWNER" | "MEMBER" = "OWNER") {
  return {
    core: {
      resolveUser: vi.fn().mockResolvedValue({ id: "user-a", name: "Ana", email: actor.email }),
      listSeumeiMemberships: vi.fn().mockResolvedValue([{ tenantId: "tenant-a", role }]),
    } as unknown as CompleteCoreAccessRepository,
    companies: { findByIdForTenantIds: vi.fn().mockResolvedValue(company) } as unknown as CompanyRepository,
    restaurant: {
      createIngredient: vi.fn(),
      createStockMovement: vi.fn(),
      findProductRecipe: vi.fn().mockResolvedValue(null),
    } as unknown as RestaurantRepository,
  }
}

describe("restaurant HTTP boundaries", () => {
  it("rejects browser tenant authority before resolving membership", async () => {
    const svc = services()
    const result = await createIngredientHandler(actor, "company-a", { tenantId: "tenant-b", name: "Pão", unit: "UNIT", lowStockThreshold: 1 }, svc)
    expect(result).toEqual({ status: 400, body: { error: "invalid_request" } })
    expect(svc.core.resolveUser).not.toHaveBeenCalled()
  })

  it("returns the same unavailable result for a missing or foreign recipe product", async () => {
    const result = await readRecipeHandler(actor, "company-a", "known-product-b", services())
    expect(result).toEqual({ status: 404, body: { error: "restaurant_not_found" } })
  })

  it("denies a MEMBER stock mutation without calling the repository", async () => {
    const svc = services("MEMBER")
    const result = await createStockMovementHandler(actor, "company-a", "ingredient-a", { expectedVersion: 1, idempotencyKey: "idem-a", type: "ENTRY", quantity: 10, reason: "Entrada" }, svc)
    expect(result).toEqual({ status: 403, body: { error: "restaurant_forbidden" } })
    expect(svc.restaurant.createStockMovement).not.toHaveBeenCalled()
  })
})
