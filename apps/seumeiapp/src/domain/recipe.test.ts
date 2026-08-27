import { describe, expect, it } from "vitest"
import { InvalidRecipeError, deriveRecipeAvailability, normalizeIngredientInput, normalizeRecipeInput } from "./recipe"

describe("restaurant recipe rules", () => {
  it("normalizes a reusable ingredient with an integer base unit", () => {
    expect(normalizeIngredientInput({ name: "  Molho da Casa ", unit: "MILLILITER", sku: " molho-01 " })).toEqual({
      name: "Molho da Casa", slug: "molho-da-casa", unit: "MILLILITER", sku: "MOLHO-01",
    })
  })

  it("normalizes a versioned recipe with unique positive integer lines", () => {
    expect(normalizeRecipeInput({
      yieldQuantity: 2,
      lines: [
        { ingredientId: "bun", quantity: 2 },
        { ingredientId: "beef", quantity: 360 },
      ],
    })).toEqual({
      yieldQuantity: 2,
      lines: [
        { ingredientId: "bun", quantity: 2, position: 0 },
        { ingredientId: "beef", quantity: 360, position: 1 },
      ],
    })
  })

  it.each([
    { yieldQuantity: 0, lines: [{ ingredientId: "bun", quantity: 1 }] },
    { yieldQuantity: 1.5, lines: [{ ingredientId: "bun", quantity: 1 }] },
    { yieldQuantity: 1, lines: [] },
    { yieldQuantity: 1, lines: [{ ingredientId: "bun", quantity: 0 }] },
    { yieldQuantity: 1, lines: [{ ingredientId: "bun", quantity: 1.2 }] },
    { yieldQuantity: 1, lines: [{ ingredientId: "bun", quantity: 1 }, { ingredientId: "bun", quantity: 2 }] },
  ])("rejects an invalid recipe %#", (input) => {
    expect(() => normalizeRecipeInput(input)).toThrow(InvalidRecipeError)
  })

  it("derives producible units from the limiting ingredient and recipe yield", () => {
    expect(deriveRecipeAvailability(2, [
      { quantity: 2, balance: 15 },
      { quantity: 360, balance: 1260 },
      { quantity: 4, balance: 20 },
    ])).toBe(7)
  })

  it("returns zero for an empty recipe or exhausted ingredient", () => {
    expect(deriveRecipeAvailability(1, [])).toBe(0)
    expect(deriveRecipeAvailability(1, [{ quantity: 1, balance: 0 }])).toBe(0)
  })
})
