import type { IngredientStockMovementType } from "../ingredient-stock"
import type { IngredientUnit } from "../recipe"

export interface IngredientRecord {
  readonly id: string
  readonly tenantId: string
  readonly name: string
  readonly slug: string
  readonly sku: string | null
  readonly unit: IngredientUnit
  readonly isActive: boolean
  readonly balance: number
  readonly lowStockThreshold: number
  readonly version: number
}

export interface RecipeRecord {
  readonly id: string
  readonly tenantId: string
  readonly variantId: string
  readonly yieldQuantity: number
  readonly version: number
  readonly lines: readonly {
    readonly ingredientId: string
    readonly ingredientName: string
    readonly unit: IngredientUnit
    readonly quantity: number
    readonly position: number
    readonly balance: number
  }[]
}

export interface ProductRecipeRecord {
  readonly product: {
    readonly id: string
    readonly name: string
    readonly description: string | null
    readonly status: "DRAFT" | "ACTIVE" | "ARCHIVED"
    readonly images: readonly { readonly url: string; readonly altText: string; readonly position: number }[]
  }
  readonly variant: { readonly id: string; readonly name: string; readonly priceCents: number; readonly isActive: boolean }
  readonly recipe: RecipeRecord | null
}

export interface IngredientStockMovementRecord {
  readonly id: string
  readonly tenantId: string
  readonly ingredientId: string
  readonly type: IngredientStockMovementType | "ORDER_CONSUMPTION"
  readonly signedQuantity: number
  readonly balanceBefore: number
  readonly balanceAfter: number
  readonly reason: string
  readonly notes: string | null
  readonly actorUserId: string
  readonly idempotencyKey: string
  readonly createdAt: string
}

export interface IngredientStockDetailRecord {
  readonly ingredient: IngredientRecord
  readonly movements: readonly IngredientStockMovementRecord[]
}

export interface RestaurantRepository {
  listIngredients(tenantId: string): Promise<readonly IngredientRecord[]>
  createIngredient(tenantId: string, input: { name: string; slug: string; sku: string | null; unit: IngredientUnit; lowStockThreshold: number }): Promise<IngredientRecord>
  findProductRecipe(tenantId: string, productId: string): Promise<ProductRecipeRecord | null>
  saveRecipe(tenantId: string, variantId: string, expectedVersion: number | null, input: { yieldQuantity: number; lines: readonly { ingredientId: string; quantity: number; position: number }[] }): Promise<RecipeRecord>
  findIngredientStock(tenantId: string, ingredientId: string): Promise<IngredientStockDetailRecord | null>
  createStockMovement(tenantId: string, ingredientId: string, expectedVersion: number, actorUserId: string, idempotencyKey: string, input: { type: IngredientStockMovementType; quantity: number; reason: string; notes?: string | null }): Promise<IngredientStockMovementRecord>
}
