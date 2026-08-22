import type { AuthorizedCompanyContext } from "./company-onboarding"
import { can } from "../domain/membership"
import { normalizeCategoryInput, normalizeProductInput, type ProductVariantInput, type ProductStatus, type ProductType } from "../domain/catalog"
import type { CatalogRepository } from "../domain/repositories/catalog-repository"

export class CatalogCapabilityDeniedError extends Error {
  constructor() { super("Sua função permite consultar, mas não alterar o catálogo"); this.name = "CatalogCapabilityDeniedError" }
}
export class CatalogRecordNotFoundError extends Error {
  constructor() { super("Registro de catálogo indisponível"); this.name = "CatalogRecordNotFoundError" }
}

function requireManage(context: AuthorizedCompanyContext) {
  if (!can(context.role, "catalog.manage")) throw new CatalogCapabilityDeniedError()
}

export async function readCatalog(context: AuthorizedCompanyContext, repository: CatalogRepository) {
  const [categories, products] = await Promise.all([
    repository.listCategories(context.company.tenantId), repository.listProducts(context.company.tenantId),
  ])
  return { categories, products, canManage: can(context.role, "catalog.manage") }
}

export async function createCatalogCategory(context: AuthorizedCompanyContext, input: { name: string; slug?: string; description?: string | null }, repository: CatalogRepository) {
  requireManage(context)
  return repository.createCategory(context.company.tenantId, normalizeCategoryInput(input))
}

export async function createCatalogProduct(context: AuthorizedCompanyContext, input: {
  name: string; slug?: string; description?: string | null; categoryId?: string | null
  type: ProductType; status: ProductStatus; variants: readonly ProductVariantInput[]
}, repository: CatalogRepository) {
  requireManage(context)
  return repository.createProduct(context.company.tenantId, normalizeProductInput(input))
}

export async function updateCatalogProduct(context: AuthorizedCompanyContext, productId: string, expectedVersion: number, input: Parameters<typeof createCatalogProduct>[1], repository: CatalogRepository) {
  requireManage(context)
  const result = await repository.updateProduct(context.company.tenantId, productId, expectedVersion, normalizeProductInput(input))
  if (!result) throw new CatalogRecordNotFoundError()
  return result
}
