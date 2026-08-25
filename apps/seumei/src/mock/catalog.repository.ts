import type { MembershipRepository } from "../domains/memberships/domain/membership.repository"
import type {
  CatalogRepository,
  TenantCatalogRepository,
} from "../domains/catalog/domain/catalog.repository"
import type { Product } from "../domains/catalog/domain/catalog"
import {
  FIXTURE_PRODUCT_CATEGORIES,
  FIXTURE_PRODUCT_MODIFIERS,
  FIXTURE_PRODUCTS,
} from "../fixtures/catalog"

export function createFixtureCatalogRepository(input: {
  readonly memberships: MembershipRepository
}): CatalogRepository {
  let products: Product[] = FIXTURE_PRODUCTS.map((product) => ({
    ...product,
    modifierIds: [...product.modifierIds],
  }))
  let copySequence = 0

  return {
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
        async listProducts() {
          return products.filter(
            (product) => product.companyId === context.companyId,
          )
        },
        async listCategories() {
          return FIXTURE_PRODUCT_CATEGORIES.filter(
            (category) => category.companyId === context.companyId,
          ).sort((left, right) => left.sortOrder - right.sortOrder)
        },
        async listModifiers() {
          return FIXTURE_PRODUCT_MODIFIERS.filter(
            (modifier) => modifier.companyId === context.companyId,
          )
        },
        async findProduct(productId) {
          return (
            products.find(
              (product) =>
                product.companyId === context.companyId &&
                product.id === productId,
            ) ?? null
          )
        },
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
          return copy
        },
      }

      return bound
    },
  }
}
