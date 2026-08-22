import { describe, expect, it, vi } from "vitest"
import { CatalogCapabilityDeniedError, createCatalogProduct, readCatalog } from "./catalog-service"
import type { CatalogRepository } from "../domain/repositories/catalog-repository"

const company = { id: "company_a", tenantId: "tenant_a", name: "A", slug: "a", createdByUserId: "u", status: "ACTIVE" as const, operationType: "SERVICE" as const, city: "X", country: "BR" }
function context(role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER") { return { userId: "user_a", company, role } }
function repository(): CatalogRepository {
  return {
    listCategories: vi.fn(async () => []), listProducts: vi.fn(async () => []), findProduct: vi.fn(async () => null),
    createCategory: vi.fn(), createProduct: vi.fn(async () => ({ id: "p", tenantId: "tenant_a", categoryId: null, name: "Café", slug: "cafe", description: null, type: "SIMPLE" as const, status: "DRAFT" as const, version: 1, variants: [] })), updateProduct: vi.fn(),
  }
}

describe("catalog application authorization", () => {
  it("reads only through the authorized company tenant", async () => {
    const repo = repository(); await readCatalog(context("VIEWER"), repo)
    expect(repo.listProducts).toHaveBeenCalledWith("tenant_a")
    expect(repo.listCategories).toHaveBeenCalledWith("tenant_a")
  })
  it("denies member mutation before repository access", async () => {
    const repo = repository()
    await expect(createCatalogProduct(context("MEMBER"), { name: "Café", type: "SIMPLE", status: "DRAFT", variants: [{ name: "Padrão", price: "9,00" }] }, repo)).rejects.toBeInstanceOf(CatalogCapabilityDeniedError)
    expect(repo.createProduct).not.toHaveBeenCalled()
  })
})
