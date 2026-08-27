import { catalogSlug } from "./catalog"

export type IngredientUnit = "UNIT" | "GRAM" | "MILLILITER"

export class InvalidRecipeError extends Error {
  constructor(message: string) { super(message); this.name = "InvalidRecipeError" }
}

function clean(value: string): string { return value.trim().replace(/\s+/g, " ") }
function positiveInteger(value: number): boolean { return Number.isSafeInteger(value) && value > 0 }

export function normalizeIngredientInput(input: { name: string; slug?: string; sku?: string | null; unit: IngredientUnit }) {
  const name = clean(input.name)
  const slug = catalogSlug(input.slug || name)
  const sku = clean(input.sku || "").toUpperCase() || null
  if (name.length < 2 || name.length > 100 || slug.length < 2 || slug.length > 64) throw new InvalidRecipeError("Ingrediente inválido")
  if (!(["UNIT", "GRAM", "MILLILITER"] as const).includes(input.unit)) throw new InvalidRecipeError("Unidade inválida")
  if (sku && sku.length > 64) throw new InvalidRecipeError("SKU inválido")
  return { name, slug, unit: input.unit, sku }
}

export function normalizeRecipeInput(input: { yieldQuantity: number; lines: readonly { ingredientId: string; quantity: number }[] }) {
  if (!positiveInteger(input.yieldQuantity) || input.lines.length === 0 || input.lines.length > 100) throw new InvalidRecipeError("Receita inválida")
  const lines = input.lines.map((line, position) => {
    const ingredientId = clean(line.ingredientId)
    if (!ingredientId || !positiveInteger(line.quantity)) throw new InvalidRecipeError("Quantidade de receita inválida")
    return { ingredientId, quantity: line.quantity, position }
  })
  if (new Set(lines.map((line) => line.ingredientId)).size !== lines.length) throw new InvalidRecipeError("Ingrediente duplicado")
  return { yieldQuantity: input.yieldQuantity, lines }
}

export function deriveRecipeAvailability(yieldQuantity: number, lines: readonly { quantity: number; balance: number }[]): number {
  if (!positiveInteger(yieldQuantity) || lines.length === 0) return 0
  let result = Number.MAX_SAFE_INTEGER
  for (const line of lines) {
    if (!positiveInteger(line.quantity) || !Number.isSafeInteger(line.balance) || line.balance < 0) return 0
    const producible = Math.floor((line.balance * yieldQuantity) / line.quantity)
    result = Math.min(result, producible)
  }
  return result === Number.MAX_SAFE_INTEGER ? 0 : result
}
