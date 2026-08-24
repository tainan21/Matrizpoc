import { describe, expect, it } from "vitest"
import { DEMO_RESTAURANTS } from "./provision-demo-restaurant"

describe("DEMO_RESTAURANTS", () => {
  it("defines distinct, complete and deterministic restaurant datasets", () => {
    const galaxia = DEMO_RESTAURANTS["galaxia-burger"]
    const sabor = DEMO_RESTAURANTS["sabor-e-brasa"]

    expect(galaxia.products).toHaveLength(4)
    expect(galaxia.ingredients.length).toBeGreaterThanOrEqual(8)
    expect(galaxia.products.every((product) => product.recipe.length > 0 && product.image.startsWith("/demo/"))).toBe(true)
    expect(sabor.products.length).toBeGreaterThanOrEqual(2)
    expect(new Set(galaxia.products.map(({ slug }) => slug))).not.toEqual(new Set(sabor.products.map(({ slug }) => slug)))
    expect(new Set(galaxia.ingredients.map(({ slug }) => slug)).size).toBe(galaxia.ingredients.length)
  })
})
