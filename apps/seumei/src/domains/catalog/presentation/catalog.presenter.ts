import type {
  Product,
  ProductCategory,
  ProductCategoryId,
  ProductId,
  ProductModifier,
  ProductModifierId,
} from "../domain/catalog"

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

export type CatalogStockTone = "healthy" | "low" | "out"

export interface CatalogMetrics {
  readonly total: number
  readonly active: number
  readonly lowStock: number
  readonly outOfStock: number
  readonly featured: number
}

export interface CatalogCategoryOption {
  readonly id: ProductCategoryId
  readonly label: string
  readonly count: number
}

export interface CatalogModifierOption {
  readonly id: ProductModifierId
  readonly label: string
  readonly priceDeltaCents: number
  readonly priceLabel: string
  readonly available: boolean
}

export interface CatalogProductRow {
  readonly id: ProductId
  readonly name: string
  readonly description: string
  readonly imageUrl: string
  readonly categoryId: ProductCategoryId
  readonly categoryName: string
  readonly priceCents: number
  readonly priceLabel: string
  readonly stockQuantity: number
  readonly stockLabel: string
  readonly stockTone: CatalogStockTone
  readonly available: boolean
  readonly featured: boolean
  readonly modifierCount: number
  readonly modifierIds: readonly ProductModifierId[]
}

export interface CatalogViewModel {
  readonly metrics: CatalogMetrics
  readonly categories: readonly CatalogCategoryOption[]
  readonly modifiers: readonly CatalogModifierOption[]
  readonly rows: readonly CatalogProductRow[]
}

function formatCurrency(cents: number): string {
  return currency.format(cents / 100).replace(/\s/g, " ")
}

function stockPresentation(stockQuantity: number): {
  readonly label: string
  readonly tone: CatalogStockTone
} {
  if (stockQuantity === 0) return { label: "Fora de estoque", tone: "out" }
  if (stockQuantity <= 10) {
    return { label: `${stockQuantity} em estoque`, tone: "low" }
  }
  return { label: `${stockQuantity} em estoque`, tone: "healthy" }
}

export function toCatalogViewModel(input: {
  readonly products: readonly Product[]
  readonly categories: readonly ProductCategory[]
  readonly modifiers: readonly ProductModifier[]
}): CatalogViewModel {
  const categoriesById = new Map(
    input.categories.map((category) => [category.id, category]),
  )
  const categoryCounts = new Map<ProductCategoryId, number>()
  for (const product of input.products) {
    categoryCounts.set(
      product.categoryId,
      (categoryCounts.get(product.categoryId) ?? 0) + 1,
    )
  }

  return {
    metrics: {
      total: input.products.length,
      active: input.products.filter((product) => product.available).length,
      lowStock: input.products.filter(
        (product) => product.stockQuantity > 0 && product.stockQuantity <= 10,
      ).length,
      outOfStock: input.products.filter((product) => product.stockQuantity === 0)
        .length,
      featured: input.products.filter((product) => product.featured).length,
    },
    categories: input.categories.map((category) => ({
      id: category.id,
      label: category.name,
      count: categoryCounts.get(category.id) ?? 0,
    })),
    modifiers: input.modifiers.map((modifier) => ({
      id: modifier.id,
      label: modifier.name,
      priceDeltaCents: modifier.priceDeltaCents,
      priceLabel: formatCurrency(modifier.priceDeltaCents),
      available: modifier.available,
    })),
    rows: input.products.map((product) => {
      const stock = stockPresentation(product.stockQuantity)
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        categoryId: product.categoryId,
        categoryName:
          categoriesById.get(product.categoryId)?.name ?? "Sem categoria",
        priceCents: product.priceCents,
        priceLabel: formatCurrency(product.priceCents),
        stockQuantity: product.stockQuantity,
        stockLabel: stock.label,
        stockTone: stock.tone,
        available: product.available,
        featured: product.featured,
        modifierCount: product.modifierIds.length,
        modifierIds: product.modifierIds,
      }
    }),
  }
}
