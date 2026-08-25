import { describe, expect, it } from "vitest"
import { vi } from "vitest"
import { DEMO_RESTAURANTS, reconcileDemoOrderReceipts } from "./provision-demo-restaurant"

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

  it("reconciles every existing demo order through the idempotent finance contract", async () => {
    const reconcileOrderReceipt = vi.fn().mockResolvedValue({ id: "entry" })

    await expect(reconcileDemoOrderReceipts("tenant-a", ["order-1", "order-2"], { reconcileOrderReceipt } as never)).resolves.toBe(2)
    expect(reconcileOrderReceipt).toHaveBeenNthCalledWith(1, "tenant-a", "order-1")
    expect(reconcileOrderReceipt).toHaveBeenNthCalledWith(2, "tenant-a", "order-2")
  })
})
