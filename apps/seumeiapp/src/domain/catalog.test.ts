import { describe, expect, it } from "vitest"
import {
  InvalidCatalogInputError,
  normalizeCategoryInput,
  normalizeProductInput,
  parsePriceToCents,
} from "./catalog"

describe("catalog domain", () => {
  it("normalizes category names and accent-free slugs", () => {
    expect(normalizeCategoryInput({ name: "  Cafés  especiais " })).toEqual({
      name: "Cafés especiais",
      slug: "cafes-especiais",
      description: null,
    })
  })

  it.each([["19,90", 1990], ["19.90", 1990], ["0,01", 1], ["1.234,56", 123456]])(
    "parses %s without floating-point storage",
    (value, cents) => expect(parsePriceToCents(value)).toBe(cents),
  )

  it.each(["", "0", "-1", "12,345", "abc"])("rejects invalid price %s", (value) => {
    expect(() => parsePriceToCents(value)).toThrow(InvalidCatalogInputError)
  })

  it("creates one canonical variant for a simple product", () => {
    const product = normalizeProductInput({
      name: "  Café coado ", type: "SIMPLE", status: "DRAFT",
      variants: [{ name: "ignorado", sku: " cafe-01 ", price: "9,50" }],
    })
    expect(product.slug).toBe("cafe-coado")
    expect(product.variants).toEqual([
      { name: "Padrão", sku: "CAFE-01", priceCents: 950, position: 0 },
    ])
  })

  it("requires distinct named variants for a configurable product", () => {
    expect(() => normalizeProductInput({
      name: "Camiseta", type: "CONFIGURABLE", status: "ACTIVE",
      variants: [
        { name: "Azul", sku: "AZUL", price: "49,90" },
        { name: " azul ", sku: "OUTRA", price: "49,90" },
      ],
    })).toThrow("Cada variante precisa de um nome único")
  })
})
