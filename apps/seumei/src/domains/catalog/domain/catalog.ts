import type { CompanyId } from "../../companies/domain/company"

export type ProductId = string & { readonly __brand: "SeumeiProductId" }
export type ProductCategoryId = string & {
  readonly __brand: "SeumeiProductCategoryId"
}
export type ProductModifierId = string & {
  readonly __brand: "SeumeiProductModifierId"
}

export function asProductId(value: string): ProductId {
  return value as ProductId
}

export function asProductCategoryId(value: string): ProductCategoryId {
  return value as ProductCategoryId
}

export function asProductModifierId(value: string): ProductModifierId {
  return value as ProductModifierId
}

export interface ProductCategory {
  readonly id: ProductCategoryId
  readonly companyId: CompanyId
  readonly name: string
  readonly slug: string
  readonly sortOrder: number
}

export interface ProductModifier {
  readonly id: ProductModifierId
  readonly companyId: CompanyId
  readonly name: string
  readonly priceDeltaCents: number
  readonly available: boolean
}

export interface Product {
  readonly id: ProductId
  readonly companyId: CompanyId
  readonly categoryId: ProductCategoryId
  readonly name: string
  readonly description: string
  readonly priceCents: number
  readonly imageUrl: string
  readonly stockQuantity: number
  readonly available: boolean
  readonly featured: boolean
  readonly modifierIds: readonly ProductModifierId[]
  readonly createdAt: string
  readonly updatedAt: string
}

export interface SaveProductInput {
  readonly id?: ProductId
  readonly categoryId: ProductCategoryId
  readonly name: string
  readonly description: string
  readonly priceCents: number
  readonly imageUrl?: string
  readonly stockQuantity: number
  readonly available: boolean
  readonly featured: boolean
  readonly modifierIds?: readonly ProductModifierId[]
}
