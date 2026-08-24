import { describe, expect, it } from "vitest"
import { toRecipeViewModel } from "./recipe.presenter"

describe("recipe presenter", () => {
  it("formats culinary detail and derives limiting availability", () => {
    const vm = toRecipeViewModel({
      product: { id: "p", name: "Galaxia Smash", description: "Dois smash burgers", status: "ACTIVE", images: [{ url: "/demo/smash.webp", altText: "Galaxia Smash", position: 0 }] },
      variant: { id: "v", name: "Padrão", priceCents: 2990, isActive: true },
      recipe: { id: "r", tenantId: "secret", variantId: "v", yieldQuantity: 1, version: 2, lines: [
        { ingredientId: "bun", ingredientName: "Pão brioche", unit: "UNIT", quantity: 1, position: 0, balance: 20 },
        { ingredientId: "beef", ingredientName: "Blend bovino", unit: "GRAM", quantity: 180, position: 1, balance: 900 },
      ] },
    })
    expect(vm).toMatchObject({ productName: "Galaxia Smash", price: "R$ 29,90", availability: "5 unidades", image: { altText: "Galaxia Smash" }, version: 2 })
    expect(vm.lines[1]).toMatchObject({ quantity: "180 g", balance: "900 g" })
    expect(JSON.stringify(vm)).not.toContain("secret")
  })
})
