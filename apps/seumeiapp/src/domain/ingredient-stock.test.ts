import { describe, expect, it } from "vitest"
import { InsufficientIngredientStockError, InvalidStockMovementError, applyIngredientStockMovement, ingredientStockHealth } from "./ingredient-stock"

describe("ingredient stock rules", () => {
  it.each([
    ["ENTRY", 10, 4, { signedQuantity: 4, balanceBefore: 10, balanceAfter: 14 }],
    ["EXIT", 10, 4, { signedQuantity: -4, balanceBefore: 10, balanceAfter: 6 }],
    ["RECONCILIATION", 10, 7, { signedQuantity: -3, balanceBefore: 10, balanceAfter: 7 }],
    ["RECONCILIATION", 10, 12, { signedQuantity: 2, balanceBefore: 10, balanceAfter: 12 }],
  ] as const)("applies %s atomically", (type, balance, quantity, expected) => {
    expect(applyIngredientStockMovement(balance, { type, quantity, reason: "Contagem operacional" })).toEqual(expected)
  })

  it("rejects an exit that would make balance negative", () => {
    expect(() => applyIngredientStockMovement(3, { type: "EXIT", quantity: 4, reason: "Uso" }))
      .toThrow(InsufficientIngredientStockError)
  })

  it.each([
    { type: "ENTRY" as const, quantity: 0, reason: "Entrada" },
    { type: "ENTRY" as const, quantity: 1.2, reason: "Entrada" },
    { type: "RECONCILIATION" as const, quantity: 10, reason: "Igual", balance: 10 },
    { type: "EXIT" as const, quantity: 1, reason: " " },
  ])("rejects a no-op or malformed movement %#", ({ balance = 10, ...input }) => {
    expect(() => applyIngredientStockMovement(balance, input)).toThrow(InvalidStockMovementError)
  })

  it.each([
    [0, 5, "out"], [3, 5, "low"], [5, 5, "low"], [6, 5, "healthy"],
  ] as const)("maps balance %d threshold %d to %s", (balance, threshold, expected) => {
    expect(ingredientStockHealth(balance, threshold)).toBe(expected)
  })
})
