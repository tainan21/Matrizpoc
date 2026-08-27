import { describe, expect, it } from "vitest"
import type { SeumeiPrismaClient } from "@matriz/platform-db/seumei"
import { createCatalogRepository } from "./catalog.repository"

const productRow = {
  id: "product_a", tenantId: "tenant_a", categoryId: null, name: "Café", slug: "cafe",
  description: null, type: "SIMPLE", status: "DRAFT", version: 1,
  variants: [{ id: "variant_a", name: "Padrão", sku: "CAFE", priceCents: 900, position: 0, isActive: true }],
  images: [],
}

function client() {
  const calls: { method: string; args: any }[] = []
  const db: any = {
    productCategory: {
      findMany: async (args: any) => { calls.push({ method: "category.findMany", args }); return [] },
      findFirst: async (args: any) => { calls.push({ method: "category.findFirst", args }); return null },
      create: async (args: any) => { calls.push({ method: "category.create", args }); return { id: "category_a", tenantId: "tenant_a", isActive: true, ...args.data } },
    },
    product: {
      findMany: async (args: any) => { calls.push({ method: "product.findMany", args }); return [productRow] },
      findFirst: async (args: any) => { calls.push({ method: "product.findFirst", args }); return productRow },
      create: async (args: any) => { calls.push({ method: "product.create", args }); return productRow },
      updateMany: async (args: any) => { calls.push({ method: "product.updateMany", args }); return { count: 1 } },
    },
    productVariant: {
      deleteMany: async (args: any) => { calls.push({ method: "variant.deleteMany", args }); return { count: 1 } },
      createMany: async (args: any) => { calls.push({ method: "variant.createMany", args }); return { count: 1 } },
    },
    productImage: {
      deleteMany: async (args: any) => { calls.push({ method: "image.deleteMany", args }); return { count: 0 } },
      createMany: async (args: any) => { calls.push({ method: "image.createMany", args }); return { count: 0 } },
    },
  }
  db.$transaction = async (callback: any) => { calls.push({ method: "$transaction", args: null }); return callback(db) }
  return { db: db as SeumeiPrismaClient, calls }
}

const input = {
  categoryId: null, name: "Café", slug: "cafe", description: null,
  type: "SIMPLE" as const, status: "DRAFT" as const,
  variants: [{ name: "Padrão", sku: "CAFE", priceCents: 900, position: 0 }],
  images: [],
}

describe("catalog repository tenant boundaries", () => {
  it("lists products only inside the supplied tenant", async () => {
    const { db, calls } = client()
    await createCatalogRepository(db).listProducts("tenant_a")
    expect(calls[0]).toMatchObject({ method: "product.findMany", args: { where: { tenantId: "tenant_a" } } })
  })

  it("scopes known product IDs by tenant", async () => {
    const { db, calls } = client()
    await createCatalogRepository(db).findProduct("tenant_a", "product_b")
    expect(calls[0]).toMatchObject({ args: { where: { id: "product_b", tenantId: "tenant_a" } } })
  })

  it("creates product and variants with server tenant in one transaction", async () => {
    const { db, calls } = client()
    await createCatalogRepository(db).createProduct("tenant_a", input)
    expect(calls.map((call) => call.method)).toContain("$transaction")
    expect(calls.find((call) => call.method === "product.create")?.args.data).toMatchObject({ tenantId: "tenant_a", variants: { create: [{ tenantId: "tenant_a" }] } })
  })

  it("uses tenant and version for updates and variant replacement", async () => {
    const { db, calls } = client()
    await createCatalogRepository(db).updateProduct("tenant_a", "product_b", 4, input)
    expect(calls.find((call) => call.method === "product.updateMany")?.args.where).toEqual({ id: "product_b", tenantId: "tenant_a", version: 4 })
    expect(calls.find((call) => call.method === "variant.deleteMany")?.args.where).toEqual({ productId: "product_b", tenantId: "tenant_a" })
  })
})
