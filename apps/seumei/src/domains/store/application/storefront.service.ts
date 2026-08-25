import type { CompanyId } from "../../companies/domain/company"
import type {
  Product,
  ProductId,
  ProductModifier,
  ProductModifierId,
} from "../../catalog/domain/catalog"
import type {
  CatalogRepository,
  PublishedCatalogRepository,
} from "../../catalog/domain/catalog.repository"
import { calculateOrderItemPrice } from "../../catalog/domain/pricing"
import type { OrderRepository } from "../../orders/domain/order.repository"
import type { StoreRepository } from "../domain/store.repository"
import type { StorePublicationContext } from "../domain/store"

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

function formatCurrency(cents: number) {
  return currency.format(cents / 100).replace(/\s/g, " ")
}

export interface StorefrontProductCard {
  readonly id: ProductId
  readonly name: string
  readonly description: string
  readonly categoryId: string
  readonly categoryLabel: string
  readonly priceCents: number
  readonly priceLabel: string
  readonly imageUrl: string
  readonly featured: boolean
}

export interface StorefrontHomeViewModel {
  readonly storeId: string
  readonly companyId: CompanyId
  readonly slug: string
  readonly appearance: StorePublicationContext["store"]["appearance"]
  readonly configuration: StorePublicationContext["store"]["configuration"]
  readonly categories: readonly { readonly id: string; readonly label: string }[]
  readonly products: readonly StorefrontProductCard[]
}

export interface StorefrontModifierViewModel {
  readonly id: ProductModifierId
  readonly name: string
  readonly imageUrl: string
  readonly priceCents: number
  readonly priceLabel: string
}

export interface StorefrontProductViewModel extends StorefrontProductCard {
  readonly modifiers: readonly StorefrontModifierViewModel[]
  readonly deliveryLabel: string
}

export interface StorefrontItemInput {
  readonly productId: ProductId
  readonly modifierIds: readonly ProductModifierId[]
  readonly quantity: number
  readonly observation: string
}

export interface StorefrontItemQuote extends StorefrontItemInput {
  readonly productName: string
  readonly imageUrl: string
  readonly modifierNames: readonly string[]
  readonly baseCents: number
  readonly modifiersCents: number
  readonly totalCents: number
  readonly unitLabel: string
  readonly baseLabel: string
  readonly modifiersLabel: string
  readonly totalLabel: string
}

export interface PlaceOrderInput {
  readonly customerName: string
  readonly items: readonly StorefrontItemInput[]
}

export type StorefrontError =
  | "store-not-found"
  | "ordering-disabled"
  | "product-not-found"
  | "invalid-modifier"
  | "invalid-quantity"
  | "invalid-order"

export interface StorefrontService {
  getHome(slug: string): Promise<
    | { readonly ok: true; readonly store: StorefrontHomeViewModel }
    | { readonly ok: false; readonly error: StorefrontError }
  >
  getProduct(slug: string, productId: ProductId): Promise<
    | { readonly ok: true; readonly product: StorefrontProductViewModel }
    | { readonly ok: false; readonly error: StorefrontError }
  >
  quoteItem(slug: string, input: StorefrontItemInput): Promise<
    | { readonly ok: true; readonly quote: StorefrontItemQuote }
    | { readonly ok: false; readonly error: StorefrontError }
  >
  placeOrder(slug: string, input: PlaceOrderInput): Promise<
    | {
        readonly ok: true
        readonly order: {
          readonly id: string
          readonly companyId: CompanyId
          readonly status: "placed"
          readonly totalCents: number
          readonly totalLabel: string
        }
      }
    | { readonly ok: false; readonly error: StorefrontError }
  >
}

interface ResolvedStorefront {
  readonly publication: StorePublicationContext
  readonly catalog: PublishedCatalogRepository
}

function productCard(
  product: Product,
  categoryLabel: string,
): StorefrontProductCard {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    categoryLabel,
    priceCents: product.priceCents,
    priceLabel: formatCurrency(product.priceCents),
    imageUrl: product.imageUrl,
    featured: product.featured,
  }
}

function availableForStore(product: Product) {
  return product.available && product.stockQuantity > 0
}

export function createStorefrontService(input: {
  readonly stores: StoreRepository
  readonly catalog: CatalogRepository
  readonly orders: OrderRepository
}): StorefrontService {
  async function resolve(slug: string): Promise<ResolvedStorefront | null> {
    const publication = await input.stores.resolvePublished(slug)
    if (!publication) return null
    return {
      publication,
      catalog: await input.catalog.bindPublished(publication.companyId),
    }
  }

  async function findAvailableProduct(
    resolved: ResolvedStorefront,
    productId: ProductId,
  ): Promise<Product | null> {
    const product = await resolved.catalog.findProduct(productId)
    return product && availableForStore(product) ? product : null
  }

  async function selectedModifiers(
    resolved: ResolvedStorefront,
    product: Product,
    ids: readonly ProductModifierId[],
  ): Promise<readonly ProductModifier[] | null> {
    if (new Set(ids).size !== ids.length) return null
    const allowed = new Set(product.modifierIds)
    if (ids.some((id) => !allowed.has(id))) return null
    const modifiers = (await resolved.catalog.listModifiers()).filter((modifier) =>
      ids.includes(modifier.id),
    )
    return modifiers.length === ids.length ? modifiers : null
  }

  async function quote(
    resolved: ResolvedStorefront,
    item: StorefrontItemInput,
  ): Promise<
    | { readonly ok: true; readonly quote: StorefrontItemQuote }
    | { readonly ok: false; readonly error: StorefrontError }
  > {
    const product = await findAvailableProduct(resolved, item.productId)
    if (!product) return { ok: false, error: "product-not-found" }
    if (item.observation.length > 120) return { ok: false, error: "invalid-order" }
    const modifiers = await selectedModifiers(resolved, product, item.modifierIds)
    if (!modifiers) return { ok: false, error: "invalid-modifier" }
    const calculated = calculateOrderItemPrice({
      product,
      selectedModifiers: modifiers,
      quantity: item.quantity,
    })
    if (!calculated.ok) {
      return {
        ok: false,
        error:
          calculated.error === "invalid-quantity"
            ? "invalid-quantity"
            : calculated.error === "modifier-unavailable"
              ? "invalid-modifier"
              : "product-not-found",
      }
    }
    return {
      ok: true,
      quote: {
        ...item,
        observation: item.observation.trim(),
        productName: product.name,
        imageUrl: product.imageUrl,
        modifierNames: modifiers.map((modifier) => modifier.name),
        baseCents: calculated.price.baseCents,
        modifiersCents: calculated.price.modifiersCents,
        totalCents: calculated.price.totalCents,
        unitLabel: formatCurrency(calculated.price.totalCents / item.quantity),
        baseLabel: formatCurrency(calculated.price.baseCents),
        modifiersLabel: formatCurrency(calculated.price.modifiersCents),
        totalLabel: formatCurrency(calculated.price.totalCents),
      },
    }
  }

  return {
    async getHome(slug) {
      const resolved = await resolve(slug)
      if (!resolved) return { ok: false, error: "store-not-found" }
      const [products, categories] = await Promise.all([
        resolved.catalog.listProducts(),
        resolved.catalog.listCategories(),
      ])
      const categoryLabels = new Map(
        categories.map((category) => [category.id, category.name]),
      )
      return {
        ok: true,
        store: {
          storeId: resolved.publication.storeId,
          companyId: resolved.publication.companyId,
          slug: resolved.publication.slug,
          appearance: resolved.publication.store.appearance,
          configuration: resolved.publication.store.configuration,
          categories: categories.map((category) => ({
            id: category.id,
            label: category.name,
          })),
          products: products
            .filter(availableForStore)
            .map((product) =>
              productCard(product, categoryLabels.get(product.categoryId) ?? "Catálogo"),
            ),
        },
      }
    },

    async getProduct(slug, productId) {
      const resolved = await resolve(slug)
      if (!resolved) return { ok: false, error: "store-not-found" }
      const product = await findAvailableProduct(resolved, productId)
      if (!product) return { ok: false, error: "product-not-found" }
      const [categories, allModifiers] = await Promise.all([
        resolved.catalog.listCategories(),
        resolved.catalog.listModifiers(),
      ])
      const category = categories.find((item) => item.id === product.categoryId)
      const modifiers = allModifiers.filter(
        (modifier) => product.modifierIds.includes(modifier.id) && modifier.available,
      )
      const [minimum, maximum] =
        resolved.publication.store.configuration.estimatedDeliveryMinutes
      return {
        ok: true,
        product: {
          ...productCard(product, category?.name ?? "Catálogo"),
          modifiers: modifiers.map((modifier) => ({
            id: modifier.id,
            name: modifier.name,
            imageUrl: modifier.imageUrl,
            priceCents: modifier.priceDeltaCents,
            priceLabel: formatCurrency(modifier.priceDeltaCents),
          })),
          deliveryLabel: `Entrega rápida · ${minimum}–${maximum}min`,
        },
      }
    },

    async quoteItem(slug, item) {
      const resolved = await resolve(slug)
      if (!resolved) return { ok: false, error: "store-not-found" }
      return quote(resolved, item)
    },

    async placeOrder(slug, orderInput) {
      const resolved = await resolve(slug)
      if (!resolved) return { ok: false, error: "store-not-found" }
      if (!resolved.publication.store.configuration.orderingEnabled) {
        return { ok: false, error: "ordering-disabled" }
      }
      if (!orderInput.customerName.trim() || orderInput.items.length === 0) {
        return { ok: false, error: "invalid-order" }
      }
      const quotedItems: StorefrontItemQuote[] = []
      for (const item of orderInput.items) {
        const result = await quote(resolved, item)
        if (!result.ok) return result
        quotedItems.push(result.quote)
      }
      const subtotalCents = quotedItems.reduce(
        (total, item) => total + item.totalCents,
        0,
      )
      const deliveryFeeCents =
        resolved.publication.store.configuration.deliveryFeeCents
      const totalCents = subtotalCents + deliveryFeeCents
      const order = await input.orders.create(resolved.publication, {
        customerName: orderInput.customerName,
        items: quotedItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPriceCents: Math.round(item.baseCents / item.quantity),
          modifierNames: item.modifierNames,
          modifiersCents: item.modifiersCents,
          totalCents: item.totalCents,
          observation: item.observation,
        })),
        subtotalCents,
        deliveryFeeCents,
        totalCents,
      })
      return {
        ok: true,
        order: {
          id: order.id,
          companyId: order.companyId,
          status: "placed",
          totalCents: order.totalCents,
          totalLabel: formatCurrency(order.totalCents),
        },
      }
    },
  }
}
