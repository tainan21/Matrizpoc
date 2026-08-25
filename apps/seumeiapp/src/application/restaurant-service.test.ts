import { describe, expect, it } from "vitest"
import type { AuthorizedCompanyContext } from "./company-onboarding"
import type { RestaurantRepository } from "../domain/repositories/restaurant-repository"
import { RestaurantCapabilityDeniedError, createIngredient, createStockMovement, readIngredients, saveProductRecipe } from "./restaurant-service"

function context(role: AuthorizedCompanyContext["role"], tenantId = "tenant-a"): AuthorizedCompanyContext {
  return { userId: "user-a", role, company: { id: "company-a", tenantId, name: "Galaxia Burger", slug: "galaxia-burger", createdByUserId: "user-a", status: "ACTIVE", operationType: "PHYSICAL_STORE", city: "São Paulo", country: "BR" } }
}

function repository(): RestaurantRepository {
  return {
    listIngredients: async (tenantId) => [{ id: "ingredient-a", tenantId, name: "Pão brioche", slug: "pao-brioche", sku: null, unit: "UNIT", isActive: true, balance: 20, lowStockThreshold: 5, version: 1 }],
    createIngredient: async (tenantId, input) => ({ id: "ingredient-a", tenantId, isActive: true, balance: 0, version: 1, ...input }),
    findProductRecipe: async () => null,
    saveRecipe: async (tenantId, variantId, expectedVersion, input) => ({ id: "recipe-a", tenantId, variantId, yieldQuantity: input.yieldQuantity, version: (expectedVersion ?? 0) + 1, lines: input.lines.map((line) => ({ ...line, ingredientName: "Pão brioche", unit: "UNIT", balance: 20 })) }),
    findIngredientStock: async () => null,
    createStockMovement: async (tenantId, ingredientId, _version, actorUserId, idempotencyKey, input) => ({ id: "movement-a", tenantId, ingredientId, type: input.type, signedQuantity: input.quantity, balanceBefore: 0, balanceAfter: input.quantity, reason: input.reason, notes: input.notes ?? null, actorUserId, idempotencyKey, createdAt: "2026-08-24T12:00:00.000Z" }),
  }
}

describe("restaurant application services", () => {
  it("passes only the server-authorized tenant to restaurant reads", async () => {
    await expect(readIngredients(context("VIEWER"), repository())).resolves.toEqual([
      expect.objectContaining({ tenantId: "tenant-a", name: "Pão brioche" }),
    ])
  })

  it("normalizes ingredient and recipe writes for an administrator", async () => {
    await expect(createIngredient(context("ADMIN"), { name: " Molho da casa ", unit: "MILLILITER", lowStockThreshold: 500 }, repository()))
      .resolves.toMatchObject({ slug: "molho-da-casa", lowStockThreshold: 500 })
    await expect(saveProductRecipe(context("ADMIN"), "variant-a", null, { yieldQuantity: 1, lines: [{ ingredientId: "ingredient-a", quantity: 2 }] }, repository()))
      .resolves.toMatchObject({ variantId: "variant-a", version: 1 })
  })

  it("denies MEMBER mutations before the repository is called", async () => {
    let called = false
    const repo = { ...repository(), createStockMovement: async (...args: Parameters<RestaurantRepository["createStockMovement"]>) => { called = true; return repository().createStockMovement(...args) } }
    await expect(createStockMovement(context("MEMBER"), "ingredient-a", { expectedVersion: 1, idempotencyKey: "idem-a", type: "ENTRY", quantity: 10, reason: "Entrada" }, repo))
      .rejects.toBeInstanceOf(RestaurantCapabilityDeniedError)
    expect(called).toBe(false)
  })
})
