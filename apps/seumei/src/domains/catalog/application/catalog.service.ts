import type {
  Product,
  ProductId,
  ProductModifierId,
  SaveProductInput,
} from "../domain/catalog"
import type {
  CatalogRepository,
  TenantCatalogRepository,
} from "../domain/catalog.repository"
import type { SeumeiTenantContext } from "../../memberships/domain/tenant-context"
import {
  toCatalogViewModel,
  type CatalogViewModel,
} from "../presentation/catalog.presenter"

export type CatalogError =
  | "catalog-unavailable"
  | "permission-denied"
  | "product-not-found"
  | "validation-error"

export type CatalogResult =
  | { readonly ok: true; readonly catalog: CatalogViewModel }
  | { readonly ok: false; readonly error: CatalogError }

export interface CatalogService {
  getProducts(context: SeumeiTenantContext): Promise<CatalogResult>
  saveProduct(
    context: SeumeiTenantContext,
    input: SaveProductInput,
  ): Promise<CatalogResult>
  setProductAvailability(
    context: SeumeiTenantContext,
    productId: ProductId,
    available: boolean,
  ): Promise<CatalogResult>
  setProductFeatured(
    context: SeumeiTenantContext,
    productId: ProductId,
    featured: boolean,
  ): Promise<CatalogResult>
  duplicateProduct(
    context: SeumeiTenantContext,
    productId: ProductId,
  ): Promise<CatalogResult>
}

interface CatalogServiceDependencies {
  readonly createProductId: () => ProductId
  readonly now: () => string
}

const defaultDependencies: CatalogServiceDependencies = {
  createProductId: () => `product-${crypto.randomUUID()}` as ProductId,
  now: () => new Date().toISOString(),
}

function can(
  context: SeumeiTenantContext,
  permission: "products.view" | "products.manage",
): boolean {
  return context.permissions.includes(permission)
}

async function present(
  repository: TenantCatalogRepository,
): Promise<CatalogResult> {
  const [products, categories, modifiers] = await Promise.all([
    repository.listProducts(),
    repository.listCategories(),
    repository.listModifiers(),
  ])
  return {
    ok: true,
    catalog: toCatalogViewModel({ products, categories, modifiers }),
  }
}

async function bind(
  repository: CatalogRepository,
  context: SeumeiTenantContext,
): Promise<TenantCatalogRepository | null> {
  return repository.bind(context)
}

export function createCatalogService(
  repository: CatalogRepository,
  dependencies: Partial<CatalogServiceDependencies> = {},
): CatalogService {
  const deps = { ...defaultDependencies, ...dependencies }

  async function mutateProduct(
    context: SeumeiTenantContext,
    productId: ProductId,
    mutation: (product: Product) => Product,
  ): Promise<CatalogResult> {
    if (!can(context, "products.manage")) {
      return { ok: false, error: "permission-denied" }
    }
    const tenantRepository = await bind(repository, context)
    if (!tenantRepository) return { ok: false, error: "catalog-unavailable" }
    const product = await tenantRepository.findProduct(productId)
    if (!product) return { ok: false, error: "product-not-found" }
    const saved = await tenantRepository.saveProduct(mutation(product))
    if (!saved) return { ok: false, error: "validation-error" }
    return present(tenantRepository)
  }

  return {
    async getProducts(context) {
      if (!can(context, "products.view")) {
        return { ok: false, error: "permission-denied" }
      }
      const tenantRepository = await bind(repository, context)
      if (!tenantRepository) return { ok: false, error: "catalog-unavailable" }
      return present(tenantRepository)
    },

    async saveProduct(context, input) {
      if (!can(context, "products.manage")) {
        return { ok: false, error: "permission-denied" }
      }
      const tenantRepository = await bind(repository, context)
      if (!tenantRepository) return { ok: false, error: "catalog-unavailable" }
      const [categories, modifiers] = await Promise.all([
        tenantRepository.listCategories(),
        tenantRepository.listModifiers(),
      ])
      const categoryExists = categories.some(
        (category) => category.id === input.categoryId,
      )
      const modifierIds = input.modifierIds ?? []
      const allowedModifierIds = new Set(modifiers.map((modifier) => modifier.id))
      const modifiersValid = modifierIds.every((id) => allowedModifierIds.has(id))
      if (
        input.name.trim().length === 0 ||
        !Number.isInteger(input.priceCents) ||
        input.priceCents < 0 ||
        !Number.isInteger(input.stockQuantity) ||
        input.stockQuantity < 0 ||
        !categoryExists ||
        !modifiersValid
      ) {
        return { ok: false, error: "validation-error" }
      }

      const existing = input.id
        ? await tenantRepository.findProduct(input.id)
        : null
      if (input.id && !existing) {
        return { ok: false, error: "product-not-found" }
      }
      const now = deps.now()
      const product: Product = {
        id: existing?.id ?? deps.createProductId(),
        companyId: context.companyId,
        categoryId: input.categoryId,
        name: input.name.trim(),
        description: input.description.trim(),
        priceCents: input.priceCents,
        imageUrl:
          input.imageUrl?.trim() ||
          existing?.imageUrl ||
          "/seumei/product-placeholder.svg",
        stockQuantity: input.stockQuantity,
        available: input.available,
        featured: input.featured,
        modifierIds,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      const saved = await tenantRepository.saveProduct(product)
      if (!saved) return { ok: false, error: "validation-error" }
      return present(tenantRepository)
    },

    async setProductAvailability(context, productId, available) {
      return mutateProduct(context, productId, (product) => ({
        ...product,
        available,
        updatedAt: deps.now(),
      }))
    },

    async setProductFeatured(context, productId, featured) {
      return mutateProduct(context, productId, (product) => ({
        ...product,
        featured,
        updatedAt: deps.now(),
      }))
    },

    async duplicateProduct(context, productId) {
      if (!can(context, "products.manage")) {
        return { ok: false, error: "permission-denied" }
      }
      const tenantRepository = await bind(repository, context)
      if (!tenantRepository) return { ok: false, error: "catalog-unavailable" }
      const duplicated = await tenantRepository.duplicateProduct(productId)
      if (!duplicated) return { ok: false, error: "product-not-found" }
      return present(tenantRepository)
    },
  }
}
