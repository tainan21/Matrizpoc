import type { Product, ProductModifier } from "./catalog"

export interface OrderItemPrice {
  readonly baseCents: number
  readonly modifiersCents: number
  readonly subtotalCents: number
  readonly totalCents: number
}

export type PriceCalculationResult =
  | { readonly ok: true; readonly price: OrderItemPrice }
  | {
      readonly ok: false
      readonly error:
        | "invalid-quantity"
        | "product-unavailable"
        | "modifier-unavailable"
        | "modifier-company-mismatch"
    }

export function calculateOrderItemPrice(input: {
  readonly product: Product
  readonly selectedModifiers: readonly ProductModifier[]
  readonly quantity: number
}): PriceCalculationResult {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return { ok: false, error: "invalid-quantity" }
  }
  if (!input.product.available) {
    return { ok: false, error: "product-unavailable" }
  }
  if (
    input.selectedModifiers.some(
      (modifier) => modifier.companyId !== input.product.companyId,
    )
  ) {
    return { ok: false, error: "modifier-company-mismatch" }
  }
  if (input.selectedModifiers.some((modifier) => !modifier.available)) {
    return { ok: false, error: "modifier-unavailable" }
  }

  const baseCents = input.product.priceCents * input.quantity
  const modifiersCents =
    input.selectedModifiers.reduce(
      (total, modifier) => total + modifier.priceDeltaCents,
      0,
    ) * input.quantity
  const subtotalCents = baseCents + modifiersCents

  return {
    ok: true,
    price: {
      baseCents,
      modifiersCents,
      subtotalCents,
      totalCents: subtotalCents,
    },
  }
}
