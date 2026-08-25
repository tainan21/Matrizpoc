import { describe, expect, it } from "vitest"
import {
  FIXTURE_PRODUCT_CATEGORIES,
  FIXTURE_PRODUCT_MODIFIERS,
  FIXTURE_PRODUCTS,
} from "../../../fixtures/catalog"
import { asCompanyId } from "../../companies/domain/company"
import { toCatalogViewModel } from "./catalog.presenter"

describe("catalog presenter", () => {
  it("derives operational metrics and BRL labels for Galáxia Burger", () => {
    const companyId = asCompanyId("company-galaxia")
    const catalog = toCatalogViewModel({
      products: FIXTURE_PRODUCTS.filter((item) => item.companyId === companyId),
      categories: FIXTURE_PRODUCT_CATEGORIES.filter(
        (item) => item.companyId === companyId,
      ),
      modifiers: FIXTURE_PRODUCT_MODIFIERS.filter(
        (item) => item.companyId === companyId,
      ),
    })

    expect(catalog.metrics).toEqual({
      total: 7,
      active: 6,
      lowStock: 2,
      outOfStock: 1,
      featured: 4,
    })
    expect(catalog.rows[0]).toMatchObject({
      name: "X-Galáxia",
      categoryName: "Burgers",
      priceLabel: "R$ 34,90",
      stockLabel: "23 em estoque",
      stockTone: "healthy",
      modifierCount: 3,
    })
  })

  it("marks low and unavailable stock with distinct tones", () => {
    const companyId = asCompanyId("company-galaxia")
    const catalog = toCatalogViewModel({
      products: FIXTURE_PRODUCTS.filter((item) => item.companyId === companyId),
      categories: FIXTURE_PRODUCT_CATEGORIES.filter(
        (item) => item.companyId === companyId,
      ),
      modifiers: FIXTURE_PRODUCT_MODIFIERS.filter(
        (item) => item.companyId === companyId,
      ),
    })

    expect(
      catalog.rows.find((row) => row.name === "Galáxia Bacon"),
    ).toMatchObject({ stockLabel: "8 em estoque", stockTone: "low" })
    expect(
      catalog.rows.find((row) => row.name === "Milk Shake Oreo"),
    ).toMatchObject({ stockLabel: "Fora de estoque", stockTone: "out" })
  })
})
