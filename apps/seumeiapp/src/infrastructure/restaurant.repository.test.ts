import { describe, expect, it } from "vitest"
import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import { IngredientRecordUnavailableError, StockIdempotencyConflictError, createRestaurantRepository } from "./restaurant.repository"

describe("createRestaurantRepository", () => {
  it("lists ingredients and balances only for the explicit tenant", async () => {
    const calls: unknown[] = []
    const db = { ingredient: { async findMany(args: unknown) { calls.push(args); return [] } } } as unknown as SeumeiPrismaClient
    await expect(createRestaurantRepository(db).listIngredients("tenant-a")).resolves.toEqual([])
    expect(calls).toEqual([{ where: { tenantId: "tenant-a", isActive: true }, include: { inventory: true }, orderBy: { name: "asc" } }])
  })

  it("does not save a recipe when a known variant belongs to another tenant", async () => {
    const writes: string[] = []
    const tx = {
      productVariant: { async findFirst() { return null } },
      recipe: { async create() { writes.push("recipe.create") } },
    }
    const db = { $transaction: async (action: (value: typeof tx) => Promise<unknown>) => action(tx) } as unknown as SeumeiPrismaClient
    await expect(createRestaurantRepository(db).saveRecipe("tenant-a", "variant-b", null, { yieldQuantity: 1, lines: [{ ingredientId: "ingredient-a", quantity: 1, position: 0 }] }))
      .rejects.toBeInstanceOf(IngredientRecordUnavailableError)
    expect(writes).toEqual([])
  })

  it("replays an identical stock command and conflicts on mismatched idempotency reuse", async () => {
    const movement = { id: "movement-a", tenantId: "tenant-a", ingredientId: "ingredient-a", type: "ENTRY", signedQuantity: 5, balanceBefore: 0, balanceAfter: 5, reason: "Abertura", notes: null, actorUserId: "user-a", idempotencyKey: "idem-a", commandHash: "hash-a", createdAt: new Date("2026-08-24T12:00:00.000Z") }
    const tx = { ingredientStockMovement: { async findUnique() { return movement } } }
    const db = { $transaction: async (action: (value: typeof tx) => Promise<unknown>) => action(tx) } as unknown as SeumeiPrismaClient
    const repository = createRestaurantRepository(db, () => "hash-a")
    await expect(repository.createStockMovement("tenant-a", "ingredient-a", 1, "user-a", "idem-a", { type: "ENTRY", quantity: 5, reason: "Abertura" }))
      .resolves.toMatchObject({ id: "movement-a", balanceAfter: 5 })

    const mismatched = createRestaurantRepository(db, () => "hash-b")
    await expect(mismatched.createStockMovement("tenant-a", "ingredient-a", 1, "user-a", "idem-a", { type: "ENTRY", quantity: 6, reason: "Abertura" }))
      .rejects.toBeInstanceOf(StockIdempotencyConflictError)
  })
})
