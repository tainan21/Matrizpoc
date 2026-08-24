import type { Product, ProductCategory } from "../../domain/catalog"
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
export interface CatalogEditorProductViewModel {
  readonly id: string; readonly name: string; readonly slug: string; readonly description: string
  readonly categoryId: string; readonly type: "SIMPLE" | "CONFIGURABLE"; readonly status: "DRAFT" | "ACTIVE" | "ARCHIVED"; readonly version: number
  readonly variants: readonly { readonly name: string; readonly sku: string; readonly price: string }[]
  readonly images: readonly { readonly url: string; readonly altText: string }[]
}
export function toCatalogViewModel(input: { canManage: boolean; categories: readonly ProductCategory[]; products: readonly Product[] }) {
  const productWord = input.products.length === 1 ? "produto" : "produtos"
  const categoryWord = input.categories.length === 1 ? "categoria" : "categorias"
  return {
    canManage: input.canManage, isEmpty: input.products.length === 0,
    summaryLabel: `${input.products.length} ${productWord} · ${input.categories.length} ${categoryWord}`,
    categories: input.categories.map((item) => ({ id: item.id, name: item.name, slug: item.slug, isActive: item.isActive })),
    products: input.products.map((item) => ({ id: item.id, name: item.name, slug: item.slug, status: item.status, type: item.type, variantCount: item.variants.length, priceLabel: item.variants.length ? money.format(Math.min(...item.variants.map((variant) => variant.priceCents)) / 100) : "Sem preço", image: item.images[0] ? { url: item.images[0].url, altText: item.images[0].altText } : null })),
  }
}
export function toCatalogEditorProductViewModel(product: Product): CatalogEditorProductViewModel {
  return { id: product.id, name: product.name, slug: product.slug, description: product.description ?? "", categoryId: product.categoryId ?? "", type: product.type, status: product.status, version: product.version,
    variants: product.variants.map((variant) => ({ name: variant.name, sku: variant.sku ?? "", price: (variant.priceCents / 100).toFixed(2).replace(".", ",") })), images: product.images.map(({ url, altText }) => ({ url, altText })) }
}
