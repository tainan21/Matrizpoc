import type { AuthorizedCompanyContext } from "./company-onboarding"
import { can } from "../domain/membership"
import { InvalidRecipeError, normalizeIngredientInput, normalizeRecipeInput, type IngredientUnit } from "../domain/recipe"
import type { IngredientStockMovementType } from "../domain/ingredient-stock"
import type { RestaurantRepository } from "../domain/repositories/restaurant-repository"

export class RestaurantCapabilityDeniedError extends Error {
  constructor() { super("Sua função não permite alterar receitas ou estoque"); this.name = "RestaurantCapabilityDeniedError" }
}

function requireCapability(context: AuthorizedCompanyContext, capability: "recipes.manage" | "stock.manage") {
  if (!can(context.role, capability)) throw new RestaurantCapabilityDeniedError()
}

export async function readIngredients(context: AuthorizedCompanyContext, repository: RestaurantRepository) {
  return repository.listIngredients(context.company.tenantId)
}

export async function createIngredient(
  context: AuthorizedCompanyContext,
  input: { name: string; slug?: string; sku?: string | null; unit: IngredientUnit; lowStockThreshold: number },
  repository: RestaurantRepository,
) {
  requireCapability(context, "recipes.manage")
  if (!Number.isSafeInteger(input.lowStockThreshold) || input.lowStockThreshold < 0) throw new InvalidRecipeError("Limite de estoque inválido")
  return repository.createIngredient(context.company.tenantId, { ...normalizeIngredientInput(input), lowStockThreshold: input.lowStockThreshold })
}

export async function readProductRecipe(context: AuthorizedCompanyContext, productId: string, repository: RestaurantRepository) {
  return repository.findProductRecipe(context.company.tenantId, productId)
}

export async function saveProductRecipe(
  context: AuthorizedCompanyContext,
  variantId: string,
  expectedVersion: number | null,
  input: { yieldQuantity: number; lines: readonly { ingredientId: string; quantity: number }[] },
  repository: RestaurantRepository,
) {
  requireCapability(context, "recipes.manage")
  if (expectedVersion !== null && (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1)) throw new InvalidRecipeError("Versão inválida")
  return repository.saveRecipe(context.company.tenantId, variantId, expectedVersion, normalizeRecipeInput(input))
}

export async function readIngredientStock(context: AuthorizedCompanyContext, ingredientId: string, repository: RestaurantRepository) {
  return repository.findIngredientStock(context.company.tenantId, ingredientId)
}

export async function createStockMovement(
  context: AuthorizedCompanyContext,
  ingredientId: string,
  input: { expectedVersion: number; idempotencyKey: string; type: IngredientStockMovementType; quantity: number; reason: string; notes?: string | null },
  repository: RestaurantRepository,
) {
  requireCapability(context, "stock.manage")
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1 || input.idempotencyKey.trim().length < 4 || input.idempotencyKey.length > 128) {
    throw new InvalidRecipeError("Movimento inválido")
  }
  return repository.createStockMovement(
    context.company.tenantId,
    ingredientId,
    input.expectedVersion,
    context.userId,
    input.idempotencyKey.trim(),
    { type: input.type, quantity: input.quantity, reason: input.reason, notes: input.notes },
  )
}
