import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Seumei restaurant persistence contract", () => {
  const schema = readFileSync(resolve(process.cwd(), "../../prisma/seumei/schema.prisma"), "utf8")

  it("models tenant-owned images, ingredients, recipes and inventory", () => {
    for (const model of ["ProductImage", "Ingredient", "Recipe", "RecipeIngredient", "IngredientInventory", "IngredientStockMovement"]) {
      expect(schema).toContain(`model ${model} {`)
    }
    expect(schema).toContain("enum IngredientUnit {")
    expect(schema).toContain("enum IngredientStockMovementType {")
    expect(schema).toMatch(/yieldQuantity\s+Int\s+@default\(1\)/)
    expect(schema).toMatch(/quantity\s+Int/)
    expect(schema).toMatch(/balance\s+Int\s+@default\(0\)/)
    expect(schema).toMatch(/version\s+Int\s+@default\(1\)/)
    expect(schema).not.toMatch(/quantity\s+Float/)
    expect(schema).not.toMatch(/balance\s+Float/)
  })

  it("enforces compound tenant ownership and idempotency at relations", () => {
    expect(schema).toContain("@@unique([tenantId, productId, position])")
    expect(schema).toContain("@@unique([tenantId, recipeId, ingredientId])")
    expect(schema).toContain("@@unique([tenantId, ingredientId])")
    expect(schema).toContain("@@unique([tenantId, idempotencyKey])")
    expect(schema).toMatch(/ingredient\s+Ingredient\s+@relation\(fields: \[tenantId, ingredientId\], references: \[tenantId, id\]/)
    expect(schema).toMatch(/recipe\s+Recipe\s+@relation\(fields: \[tenantId, recipeId\], references: \[tenantId, id\]/)
  })
})
