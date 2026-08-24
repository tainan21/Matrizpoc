import type { Product, ProductCategory } from "../catalog"

export interface CatalogRepository {
  listCategories(tenantId: string): Promise<readonly ProductCategory[]>
  createCategory(tenantId: string, input: { name: string; slug: string; description: string | null }): Promise<ProductCategory>
  listProducts(tenantId: string): Promise<readonly Product[]>
  findProduct(tenantId: string, productId: string): Promise<Product | null>
  createProduct(tenantId: string, input: Omit<Product, "id" | "tenantId" | "version" | "variants" | "images"> & {
    variants: readonly { name: string; sku: string | null; priceCents: number; position: number }[]
    images: readonly { url: string; altText: string; position: number }[]
  }): Promise<Product>
  updateProduct(tenantId: string, productId: string, expectedVersion: number, input: Omit<Product, "id" | "tenantId" | "version" | "variants" | "images"> & {
    variants: readonly { name: string; sku: string | null; priceCents: number; position: number }[]
    images: readonly { url: string; altText: string; position: number }[]
  }): Promise<Product | null>
}
