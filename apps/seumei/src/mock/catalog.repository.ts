import type { MembershipRepository } from "../domains/memberships/domain/membership.repository"
import type { KeyValueStore } from "@matriz/platform-storage"
import type {
  CatalogRepository,
  TenantCatalogRepository,
} from "../domains/catalog/domain/catalog.repository"
import type { Product } from "../domains/catalog/domain/catalog"
import type { CompanyId } from "../domains/companies/domain/company"
import {
  FIXTURE_PRODUCT_CATEGORIES,
  FIXTURE_PRODUCT_MODIFIERS,
  FIXTURE_PRODUCTS,
} from "../fixtures/catalog"

export function createFixtureCatalogRepository(input: {
  readonly memberships: MembershipRepository
  readonly storage?: KeyValueStore
}): CatalogRepository {
  const storageKey = "catalog-products:v1"
  const seedProducts = () => FIXTURE_PRODUCTS.map((product) => ({
    ...product,
    modifierIds: [...product.modifierIds],
  }))
  let products: Product[] = input.storage?.get<Product[]>(storageKey) ?? seedProducts()
  if (input.storage && !input.storage.get<Product[]>(storageKey)) {
    input.storage.set(storageKey, products)
  }
  let copySequence = 0

  function persist() {
    input.storage?.set(storageKey, products)
  }

  function publishedReader(companyId: CompanyId) {
    return {
      async listProducts() {
        return products.filter((product) => product.companyId === companyId)
      },
      async listCategories() {
        return FIXTURE_PRODUCT_CATEGORIES.filter(
          (category) => category.companyId === companyId,
        ).sort((left, right) => left.sortOrder - right.sortOrder)
      },
      async listModifiers() {
        return FIXTURE_PRODUCT_MODIFIERS.filter(
          (modifier) => modifier.companyId === companyId,
        )
      },
      async findProduct(productId: Parameters<TenantCatalogRepository["findProduct"]>[0]) {
        return (
          products.find(
            (product) => product.companyId === companyId && product.id === productId,
          ) ?? null
        )
      },
    }
  }

  return {
    async bindPublished(companyId) {
      return publishedReader(companyId)
    },
    async bind(context) {
      const membership = await input.memberships.find(
        context.userId,
        context.companyId,
      )
      if (
        !membership ||
        membership.id !== context.membershipId ||
        membership.status !== "active"
      ) {
        return null
      }

      const categoryIds = new Set(
        FIXTURE_PRODUCT_CATEGORIES.filter(
          (category) => category.companyId === context.companyId,
        ).map((category) => category.id),
      )

      const bound: TenantCatalogRepository = {
        ...publishedReader(context.companyId),
        async saveProduct(product) {
          if (
            product.companyId !== context.companyId ||
            !categoryIds.has(product.categoryId)
          ) {
            return null
          }
          const existingIndex = products.findIndex(
            (candidate) => candidate.id === product.id,
          )
          if (
            existingIndex >= 0 &&
            products[existingIndex]!.companyId !== context.companyId
          ) {
            return null
          }
          if (existingIndex >= 0) {
            products = products.map((candidate, index) =>
              index === existingIndex ? product : candidate,
            )
          } else {
            products = [...products, product]
          }
          persist()
          return product
        },
        async duplicateProduct(productId) {
          const source = products.find(
            (product) =>
              product.companyId === context.companyId &&
              product.id === productId,
          )
          if (!source) return null
          copySequence += 1
          const now = new Date().toISOString()
          const copy: Product = {
            ...source,
            id: `${source.id}-copy-${copySequence}` as Product["id"],
            name: `${source.name} (Cópia)`,
            available: false,
            featured: false,
            createdAt: now,
            updatedAt: now,
          }
          products = [...products, copy]
          persist()
          return copy
        },
      }

      return bound
    },
  }
}
