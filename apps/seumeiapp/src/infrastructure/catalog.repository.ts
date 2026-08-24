import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import type { Product, ProductCategory, ProductImage, ProductVariant } from "../domain/catalog"
import type { CatalogRepository } from "../domain/repositories/catalog-repository"

type ProductRow = Omit<Product, "variants" | "images"> & { variants: readonly ProductVariant[]; images: readonly ProductImage[] }

function category(row: any): ProductCategory {
  return { id: row.id, tenantId: row.tenantId, name: row.name, slug: row.slug, description: row.description, isActive: row.isActive }
}

function product(row: ProductRow): Product {
  return {
    id: row.id, tenantId: row.tenantId, categoryId: row.categoryId,
    name: row.name, slug: row.slug, description: row.description,
    type: row.type, status: row.status, version: row.version,
    variants: row.variants.map((variant) => ({
      id: variant.id, name: variant.name, sku: variant.sku,
      priceCents: variant.priceCents, position: variant.position, isActive: variant.isActive,
    })),
    images: row.images.map((image) => ({ id: image.id, url: image.url, altText: image.altText, position: image.position })),
  }
}

export function createCatalogRepository(db: SeumeiPrismaClient): CatalogRepository {
  return {
    async listCategories(tenantId) {
      const rows = await db.productCategory.findMany({ where: { tenantId }, orderBy: { name: "asc" } })
      return rows.map(category)
    },
    async createCategory(tenantId, input) {
      return category(await db.productCategory.create({ data: { tenantId, ...input } }))
    },
    async listProducts(tenantId) {
      const rows = await db.product.findMany({
        where: { tenantId }, include: { variants: { orderBy: { position: "asc" } }, images: { orderBy: { position: "asc" } } }, orderBy: { name: "asc" },
      })
      return rows.map((row) => product(row as unknown as ProductRow))
    },
    async findProduct(tenantId, productId) {
      const row = await db.product.findFirst({
        where: { id: productId, tenantId }, include: { variants: { orderBy: { position: "asc" } }, images: { orderBy: { position: "asc" } } },
      })
      return row ? product(row as unknown as ProductRow) : null
    },
    async createProduct(tenantId, input) {
      return db.$transaction(async (tx) => {
        if (input.categoryId) {
          const owned = await tx.productCategory.findFirst({ where: { id: input.categoryId, tenantId, isActive: true } })
          if (!owned) return Promise.reject(new Error("CATEGORY_NOT_FOUND"))
        }
        const row = await tx.product.create({
          data: {
            tenantId, categoryId: input.categoryId, name: input.name, slug: input.slug,
            description: input.description, type: input.type, status: input.status,
            variants: { create: input.variants.map((variant) => ({ tenantId, ...variant })) },
            images: { create: input.images.map((image) => ({ tenantId, ...image })) },
          },
          include: { variants: { orderBy: { position: "asc" } }, images: { orderBy: { position: "asc" } } },
        })
        return product(row as unknown as ProductRow)
      })
    },
    async updateProduct(tenantId, productId, expectedVersion, input) {
      return db.$transaction(async (tx) => {
        if (input.categoryId) {
          const owned = await tx.productCategory.findFirst({ where: { id: input.categoryId, tenantId, isActive: true } })
          if (!owned) return null
        }
        const updated = await tx.product.updateMany({
          where: { id: productId, tenantId, version: expectedVersion },
          data: {
            categoryId: input.categoryId, name: input.name, slug: input.slug,
            description: input.description, type: input.type, status: input.status,
            version: { increment: 1 },
          },
        })
        if (updated.count !== 1) return null
        await tx.productVariant.deleteMany({ where: { productId, tenantId } })
        await tx.productVariant.createMany({
          data: input.variants.map((variant) => ({ tenantId, productId, ...variant })),
        })
        await tx.productImage.deleteMany({ where: { productId, tenantId } })
        if (input.images.length) await tx.productImage.createMany({ data: input.images.map((image) => ({ tenantId, productId, ...image })) })
        const row = await tx.product.findFirst({
          where: { id: productId, tenantId }, include: { variants: { orderBy: { position: "asc" } }, images: { orderBy: { position: "asc" } } },
        })
        return row ? product(row as unknown as ProductRow) : null
      })
    },
  }
}
