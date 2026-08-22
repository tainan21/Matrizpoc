import { describe, expect, it } from "vitest"
import { toCatalogViewModel } from "./catalog.presenter"

describe("catalog presenter", () => {
  it("formats money and exposes no tenant authority", () => {
    const view = toCatalogViewModel({ canManage: true, categories: [], products: [{
      id: "p", tenantId: "tenant_secret", categoryId: null, name: "Café", slug: "cafe", description: null,
      type: "SIMPLE", status: "ACTIVE", version: 1,
      variants: [{ id: "v", name: "Padrão", sku: null, priceCents: 1990, position: 0, isActive: true }],
    }] })
    expect(view.products[0].priceLabel).toMatch(/19,90/)
    expect(view.summaryLabel).toBe("1 produto · 0 categorias")
    expect(JSON.stringify(view)).not.toContain("tenant_secret")
  })
  it("represents a truthful empty catalog", () => {
    const view = toCatalogViewModel({ canManage: false, categories: [], products: [] })
    expect(view.isEmpty).toBe(true)
    expect(view.summaryLabel).toBe("0 produtos · 0 categorias")
  })
})
