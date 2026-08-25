import { describe, expect, it } from "vitest"
import { asCompanyId } from "../../companies/domain/company"
import {
  asProductCategoryId,
  asProductId,
  asProductModifierId,
  type Product,
  type ProductModifier,
} from "./catalog"
import { calculateOrderItemPrice } from "./pricing"

const galaxiaId = asCompanyId("company-galaxia")
const matrizId = asCompanyId("company-matriz-labs")

const product: Product = {
  id: asProductId("product-x-galaxia"),
  companyId: galaxiaId,
  categoryId: asProductCategoryId("category-burgers"),
  name: "X-Galáxia",
  description: "Burger fixture",
  priceCents: 3490,
  imageUrl: "/x-galaxia.png",
  stockQuantity: 23,
  available: true,
  featured: true,
  modifierIds: [asProductModifierId("modifier-fries")],
  createdAt: "2026-08-24T00:00:00.000Z",
  updatedAt: "2026-08-24T00:00:00.000Z",
}

const fries: ProductModifier = {
  id: asProductModifierId("modifier-fries"),
  companyId: galaxiaId,
  name: "Batata Suprema",
  priceDeltaCents: 1290,
  available: true,
}

describe("calculateOrderItemPrice", () => {
  it("calculates base, modifiers and total for the requested quantity", () => {
    const result = calculateOrderItemPrice({
      product,
      selectedModifiers: [fries],
      quantity: 2,
    })

    expect(result).toEqual({
      ok: true,
      price: {
        baseCents: 6980,
        modifiersCents: 2580,
        subtotalCents: 9560,
        totalCents: 9560,
      },
    })
  })

  it("rejects zero and fractional quantities", () => {
    expect(
      calculateOrderItemPrice({ product, selectedModifiers: [], quantity: 0 }),
    ).toEqual({ ok: false, error: "invalid-quantity" })
    expect(
      calculateOrderItemPrice({ product, selectedModifiers: [], quantity: 1.5 }),
    ).toEqual({ ok: false, error: "invalid-quantity" })
  })

  it("rejects unavailable products and modifiers", () => {
    expect(
      calculateOrderItemPrice({
        product: { ...product, available: false },
        selectedModifiers: [],
        quantity: 1,
      }),
    ).toEqual({ ok: false, error: "product-unavailable" })
    expect(
      calculateOrderItemPrice({
        product,
        selectedModifiers: [{ ...fries, available: false }],
        quantity: 1,
      }),
    ).toEqual({ ok: false, error: "modifier-unavailable" })
  })

  it("rejects a modifier owned by another company", () => {
    expect(
      calculateOrderItemPrice({
        product,
        selectedModifiers: [{ ...fries, companyId: matrizId }],
        quantity: 1,
      }),
    ).toEqual({ ok: false, error: "modifier-company-mismatch" })
  })
})
