import type { SeumeiTenantContext } from "../../memberships/domain/tenant-context"
import type { CompanyId } from "../../companies/domain/company"
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
  bindPublished(companyId: CompanyId): Promise<PublishedCatalogRepository>
}

export type PublishedCatalogRepository = Pick<
  TenantCatalogRepository,
  "listProducts" | "listCategories" | "listModifiers" | "findProduct"
>
