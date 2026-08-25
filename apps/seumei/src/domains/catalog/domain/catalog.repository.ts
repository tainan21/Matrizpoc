import type { SeumeiTenantContext } from "../../memberships/domain/tenant-context"
import type {
  Product,
  ProductCategory,
  ProductId,
  ProductModifier,
} from "./catalog"

export interface TenantCatalogRepository {
  listProducts(): Promise<readonly Product[]>
  listCategories(): Promise<readonly ProductCategory[]>
  listModifiers(): Promise<readonly ProductModifier[]>
  findProduct(productId: ProductId): Promise<Product | null>
  saveProduct(product: Product): Promise<Product | null>
  duplicateProduct(productId: ProductId): Promise<Product | null>
}

export interface CatalogRepository {
  bind(context: SeumeiTenantContext): Promise<TenantCatalogRepository | null>
}
