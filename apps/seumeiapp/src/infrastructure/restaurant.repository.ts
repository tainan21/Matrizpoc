import { createHash } from "node:crypto"
import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import { applyIngredientStockMovement } from "../domain/ingredient-stock"
import type { IngredientRecord, IngredientStockMovementRecord, RecipeRecord, RestaurantRepository } from "../domain/repositories/restaurant-repository"

export class IngredientRecordUnavailableError extends Error {
  constructor() { super("Registro de restaurante indisponível"); this.name = "IngredientRecordUnavailableError" }
}
export class RestaurantVersionConflictError extends Error {
  constructor() { super("O registro foi alterado por outra operação"); this.name = "RestaurantVersionConflictError" }
}
export class StockIdempotencyConflictError extends Error {
  constructor() { super("A chave de idempotência já representa outro movimento"); this.name = "StockIdempotencyConflictError" }
}

function defaultCommandHash(value: string): string { return createHash("sha256").update(value).digest("hex") }
function ingredient(row: any): IngredientRecord {
  return {
    id: row.id, tenantId: row.tenantId, name: row.name, slug: row.slug, sku: row.sku,
    unit: row.unit, isActive: row.isActive,
    balance: row.inventory?.balance ?? 0,
    lowStockThreshold: row.inventory?.lowStockThreshold ?? 0,
    version: row.inventory?.version ?? 1,
  }
}
function movement(row: any): IngredientStockMovementRecord {
  return {
    id: row.id, tenantId: row.tenantId, ingredientId: row.ingredientId, type: row.type,
    signedQuantity: row.signedQuantity, balanceBefore: row.balanceBefore, balanceAfter: row.balanceAfter,
    reason: row.reason, notes: row.notes, actorUserId: row.actorUserId, idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt.toISOString(),
  }
}
function recipe(row: any): RecipeRecord {
  return {
    id: row.id, tenantId: row.tenantId, variantId: row.variantId,
    yieldQuantity: row.yieldQuantity, version: row.version,
    lines: row.lines.map((line: any) => ({
      ingredientId: line.ingredientId,
      ingredientName: line.ingredient.name,
      unit: line.ingredient.unit,
      quantity: line.quantity,
      position: line.position,
      balance: line.ingredient.inventory?.balance ?? 0,
    })),
  }
}

const recipeInclude = {
  lines: {
    orderBy: { position: "asc" as const },
    include: { ingredient: { include: { inventory: true } } },
  },
}

export function createRestaurantRepository(
  db: SeumeiPrismaClient,
  commandHash: (value: string) => string = defaultCommandHash,
): RestaurantRepository {
  return {
    async listIngredients(tenantId) {
      const rows = await db.ingredient.findMany({ where: { tenantId, isActive: true }, include: { inventory: true }, orderBy: { name: "asc" } })
      return rows.map(ingredient)
    },

    async createIngredient(tenantId, input) {
      return db.$transaction(async (tx) => {
        const row = await tx.ingredient.create({
          data: {
            tenantId, name: input.name, slug: input.slug, sku: input.sku, unit: input.unit,
            inventory: { create: { lowStockThreshold: input.lowStockThreshold } },
          },
          include: { inventory: true },
        })
        return ingredient(row)
      })
    },

    async findProductRecipe(tenantId, productId) {
      const product = await db.product.findFirst({
        where: { id: productId, tenantId },
        include: {
          images: { orderBy: { position: "asc" } },
          variants: { where: { isActive: true }, orderBy: { position: "asc" }, include: { recipe: { include: recipeInclude } } },
        },
      })
      const variant = product?.variants[0]
      if (!product || !variant) return null
      return {
        product: { id: product.id, name: product.name, description: product.description, status: product.status, images: product.images.map(({ url, altText, position }) => ({ url, altText, position })) },
        variant: { id: variant.id, name: variant.name, priceCents: variant.priceCents, isActive: variant.isActive },
        recipe: variant.recipe ? recipe(variant.recipe) : null,
      }
    },

    async saveRecipe(tenantId, variantId, expectedVersion, input) {
      return db.$transaction(async (tx) => {
        const variant = await tx.productVariant.findFirst({ where: { id: variantId, tenantId, isActive: true }, select: { id: true } })
        if (!variant) throw new IngredientRecordUnavailableError()
        const ownedIngredients = await tx.ingredient.count({ where: { tenantId, id: { in: input.lines.map((line) => line.ingredientId) }, isActive: true } })
        if (ownedIngredients !== input.lines.length) throw new IngredientRecordUnavailableError()
        const existing = await tx.recipe.findFirst({ where: { tenantId, variantId }, select: { id: true, version: true } })
        if ((expectedVersion === null && existing) || (expectedVersion !== null && existing?.version !== expectedVersion)) throw new RestaurantVersionConflictError()
        let recipeId: string
        if (!existing) {
          const created = await tx.recipe.create({ data: { tenantId, variantId, yieldQuantity: input.yieldQuantity }, select: { id: true } })
          recipeId = created.id
        } else {
          const updated = await tx.recipe.updateMany({ where: { id: existing.id, tenantId, version: expectedVersion! }, data: { yieldQuantity: input.yieldQuantity, version: { increment: 1 } } })
          if (updated.count !== 1) throw new RestaurantVersionConflictError()
          recipeId = existing.id
          await tx.recipeIngredient.deleteMany({ where: { tenantId, recipeId } })
        }
        await tx.recipeIngredient.createMany({ data: input.lines.map((line) => ({ tenantId, recipeId, ...line })) })
        const saved = await tx.recipe.findFirst({ where: { id: recipeId, tenantId }, include: recipeInclude })
        if (!saved) throw new IngredientRecordUnavailableError()
        return recipe(saved)
      })
    },

    async findIngredientStock(tenantId, ingredientId) {
      const row = await db.ingredient.findFirst({
        where: { id: ingredientId, tenantId, isActive: true },
        include: { inventory: true, movements: { orderBy: { createdAt: "desc" }, take: 100 } },
      })
      return row?.inventory ? { ingredient: ingredient(row), movements: row.movements.map(movement) } : null
    },

    async createStockMovement(tenantId, ingredientId, expectedVersion, actorUserId, idempotencyKey, input) {
      const identity = commandHash(JSON.stringify({ tenantId, ingredientId, expectedVersion, actorUserId, idempotencyKey, ...input }))
      return db.$transaction(async (tx) => {
        const replay = await tx.ingredientStockMovement.findUnique({ where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } } })
        if (replay) {
          if (replay.commandHash !== identity) throw new StockIdempotencyConflictError()
          return movement(replay)
        }
        const owned = await tx.ingredient.findFirst({ where: { id: ingredientId, tenantId, isActive: true }, include: { inventory: true } })
        if (!owned?.inventory) throw new IngredientRecordUnavailableError()
        if (owned.inventory.version !== expectedVersion) throw new RestaurantVersionConflictError()
        const outcome = applyIngredientStockMovement(owned.inventory.balance, input)
        const updated = await tx.ingredientInventory.updateMany({
          where: { id: owned.inventory.id, tenantId, ingredientId, version: expectedVersion, balance: owned.inventory.balance },
          data: { balance: outcome.balanceAfter, version: { increment: 1 } },
        })
        if (updated.count !== 1) throw new RestaurantVersionConflictError()
        const created = await tx.ingredientStockMovement.create({ data: {
          tenantId, ingredientId, type: input.type, ...outcome,
          reason: input.reason.trim(), notes: input.notes?.trim() || null,
          actorUserId, idempotencyKey, commandHash: identity,
        } })
        return movement(created)
      }, { isolationLevel: "Serializable" })
    },
  }
}
