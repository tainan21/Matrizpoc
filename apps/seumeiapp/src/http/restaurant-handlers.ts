import { resolveActiveCompanyContext } from "../application/active-company"
import { CompanyAccessDeniedError } from "../application/company-access"
import { RestaurantCapabilityDeniedError, createIngredient, createStockMovement, readIngredientStock, readIngredients, readProductRecipe, saveProductRecipe } from "../application/restaurant-service"
import { InsufficientIngredientStockError, InvalidStockMovementError } from "../domain/ingredient-stock"
import { InvalidRecipeError } from "../domain/recipe"
import type { CompanyRepository } from "../domain/repositories/company-repository"
import type { CompleteCoreAccessRepository } from "../domain/repositories/core-access-repository"
import type { RestaurantRepository } from "../domain/repositories/restaurant-repository"
import { IngredientRecordUnavailableError, RestaurantVersionConflictError, StockIdempotencyConflictError } from "../infrastructure/restaurant.repository"
import type { SessionActor } from "../types/session-actor"
import type { HttpResult } from "./company-handlers"

export interface RestaurantHttpServices {
  readonly core: CompleteCoreAccessRepository
  readonly companies: CompanyRepository
  readonly restaurant: RestaurantRepository
}
function record(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === "object" && !Array.isArray(value) }
function validBody(value: unknown): value is Record<string, any> { return record(value) && !Object.hasOwn(value, "tenantId") }
async function context(actor: SessionActor, companyId: string, services: RestaurantHttpServices) {
  return resolveActiveCompanyContext(actor, companyId, services.core, services.companies)
}
function errorResult(error: unknown): HttpResult {
  if (error instanceof CompanyAccessDeniedError || error instanceof RestaurantCapabilityDeniedError) return { status: 403, body: { error: "restaurant_forbidden" } }
  if (error instanceof IngredientRecordUnavailableError) return { status: 404, body: { error: "restaurant_not_found" } }
  if (error instanceof InsufficientIngredientStockError) return { status: 409, body: { error: "insufficient_stock" } }
  if (error instanceof RestaurantVersionConflictError || error instanceof StockIdempotencyConflictError) return { status: 409, body: { error: "restaurant_conflict" } }
  if (error instanceof InvalidRecipeError || error instanceof InvalidStockMovementError) return { status: 400, body: { error: "invalid_request", message: error.message } }
  if (record(error) && error.code === "P2002") return { status: 409, body: { error: "restaurant_conflict" } }
  return { status: 500, body: { error: "internal_error" } }
}

export async function listIngredientsHandler(actor: SessionActor, companyId: string, services: RestaurantHttpServices): Promise<HttpResult> {
  try { return { status: 200, body: { ingredients: await readIngredients(await context(actor, companyId, services), services.restaurant) } } } catch (error) { return errorResult(error) }
}
export async function createIngredientHandler(actor: SessionActor, companyId: string, body: unknown, services: RestaurantHttpServices): Promise<HttpResult> {
  if (!validBody(body) || typeof body.name !== "string" || !["UNIT", "GRAM", "MILLILITER"].includes(body.unit) || !Number.isInteger(body.lowStockThreshold)) return { status: 400, body: { error: "invalid_request" } }
  try { return { status: 201, body: { ingredient: await createIngredient(await context(actor, companyId, services), body as any, services.restaurant) } } } catch (error) { return errorResult(error) }
}
export async function readRecipeHandler(actor: SessionActor, companyId: string, productId: string, services: RestaurantHttpServices): Promise<HttpResult> {
  try {
    const result = await readProductRecipe(await context(actor, companyId, services), productId, services.restaurant)
    return result ? { status: 200, body: { recipe: result } } : { status: 404, body: { error: "restaurant_not_found" } }
  } catch (error) { return errorResult(error) }
}
export async function saveRecipeHandler(actor: SessionActor, companyId: string, productId: string, body: unknown, services: RestaurantHttpServices): Promise<HttpResult> {
  if (!validBody(body) || typeof body.variantId !== "string" || (body.expectedVersion !== null && !Number.isInteger(body.expectedVersion)) || !Number.isInteger(body.yieldQuantity) || !Array.isArray(body.lines)) return { status: 400, body: { error: "invalid_request" } }
  try {
    const authorized = await context(actor, companyId, services)
    const product = await readProductRecipe(authorized, productId, services.restaurant)
    if (!product || product.variant.id !== body.variantId) return { status: 404, body: { error: "restaurant_not_found" } }
    return { status: 200, body: { recipe: await saveProductRecipe(authorized, body.variantId, body.expectedVersion, body as any, services.restaurant) } }
  } catch (error) { return errorResult(error) }
}
export async function readStockHandler(actor: SessionActor, companyId: string, ingredientId: string, services: RestaurantHttpServices): Promise<HttpResult> {
  try {
    const result = await readIngredientStock(await context(actor, companyId, services), ingredientId, services.restaurant)
    return result ? { status: 200, body: { stock: result } } : { status: 404, body: { error: "restaurant_not_found" } }
  } catch (error) { return errorResult(error) }
}
export async function createStockMovementHandler(actor: SessionActor, companyId: string, ingredientId: string, body: unknown, services: RestaurantHttpServices): Promise<HttpResult> {
  if (!validBody(body) || !Number.isInteger(body.expectedVersion) || typeof body.idempotencyKey !== "string" || !["ENTRY", "EXIT", "RECONCILIATION"].includes(body.type) || !Number.isInteger(body.quantity) || typeof body.reason !== "string") return { status: 400, body: { error: "invalid_request" } }
  try { return { status: 201, body: { movement: await createStockMovement(await context(actor, companyId, services), ingredientId, body as any, services.restaurant) } } } catch (error) { return errorResult(error) }
}
