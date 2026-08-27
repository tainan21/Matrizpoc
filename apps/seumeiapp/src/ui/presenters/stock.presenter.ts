import { ingredientStockHealth } from "../../domain/ingredient-stock"
import type { IngredientUnit } from "../../domain/recipe"
import type { IngredientRecord } from "../../domain/repositories/restaurant-repository"

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 })
export function formatIngredientQuantity(value: number, unit: IngredientUnit): string {
  if (unit === "UNIT") return `${number.format(value)} un.`
  if (unit === "GRAM") return value >= 1000 ? `${number.format(value / 1000)} kg` : `${number.format(value)} g`
  return value >= 1000 ? `${number.format(value / 1000)} L` : `${number.format(value)} ml`
}

const healthLabels = { out: "Sem saldo", low: "Estoque baixo", healthy: "Saudável" } as const
export function toStockListViewModel(ingredients: readonly IngredientRecord[]) {
  return ingredients.map((item) => {
    const health = ingredientStockHealth(item.balance, item.lowStockThreshold)
    return { id: item.id, name: item.name, balance: formatIngredientQuantity(item.balance, item.unit), threshold: formatIngredientQuantity(item.lowStockThreshold, item.unit), health, healthLabel: healthLabels[health], version: item.version }
  })
}
