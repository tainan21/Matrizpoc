import { deriveRecipeAvailability } from "../../domain/recipe"
import type { ProductRecipeRecord } from "../../domain/repositories/restaurant-repository"
import { formatIngredientQuantity } from "./stock.presenter"

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
export function toRecipeViewModel(record: ProductRecipeRecord) {
  const availability = record.recipe ? deriveRecipeAvailability(record.recipe.yieldQuantity, record.recipe.lines) : 0
  return {
    productId: record.product.id,
    productName: record.product.name,
    description: record.product.description ?? "Sem descrição cadastrada.",
    status: record.product.status,
    image: record.product.images[0] ? { url: record.product.images[0].url, altText: record.product.images[0].altText } : null,
    variantId: record.variant.id,
    variantName: record.variant.name,
    price: money.format(record.variant.priceCents / 100),
    recipeId: record.recipe?.id ?? null,
    version: record.recipe?.version ?? null,
    yieldQuantity: record.recipe?.yieldQuantity ?? 1,
    availability: `${availability} ${availability === 1 ? "unidade" : "unidades"}`,
    lines: record.recipe?.lines.map((line) => ({
      ingredientId: line.ingredientId,
      name: line.ingredientName,
      quantityValue: line.quantity,
      quantity: formatIngredientQuantity(line.quantity, line.unit),
      balance: formatIngredientQuantity(line.balance, line.unit),
      unit: line.unit,
    })) ?? [],
  }
}
export type RecipeViewModel = ReturnType<typeof toRecipeViewModel>
