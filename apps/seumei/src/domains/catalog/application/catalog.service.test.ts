import { describe, expect, it } from "vitest"
import { asUserId } from "@matriz/foundation-types"
import { asCompanyId } from "../../companies/domain/company"
import { asProductCategoryId, asProductId } from "../domain/catalog"
import { resolveTenantContext } from "../../memberships/application/resolve-tenant-context"
import { createBusinessOsRepositories } from "../../../mock/business-os.repositories"
import { createFixtureCatalogRepository } from "../../../mock/catalog.repository"
import { createCatalogService } from "./catalog.service"

const demoUserId = asUserId("user-demo-seumei")

async function setup() {
  const business = createBusinessOsRepositories({ demoUserId })
  const resolution = await resolveTenantContext({
    userId: demoUserId,
    requestedCompanyId: asCompanyId("company-galaxia"),
    memberships: business.memberships,
  })
  if (!resolution.ok) throw new Error(resolution.error)
  const service = createCatalogService(
    createFixtureCatalogRepository({ memberships: business.memberships }),
    {
      createProductId: () => asProductId("product-created-by-test"),
      now: () => "2026-08-24T20:00:00.000Z",
    },
  )
  return { context: resolution.context, service }
}

describe("catalog service", () => {
  it("returns a tenant-safe catalog view model", async () => {
    const { context, service } = await setup()

    const result = await service.getProducts(context)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.catalog.metrics.total).toBe(7)
    expect(result.catalog.rows.map((row) => row.name)).toContain("X-Galáxia")
    expect(result.catalog.rows.map((row) => row.name)).not.toContain(
      "Orbit Workspace",
    )
  })

  it("persists availability inside the bound tenant", async () => {
    const { context, service } = await setup()

    const result = await service.setProductAvailability(
      context,
      asProductId("product-milk-shake-oreo"),
      true,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(
      result.catalog.rows.find((row) => row.id === "product-milk-shake-oreo")
        ?.available,
    ).toBe(true)
  })

  it("does not reveal a product id from another tenant", async () => {
    const { context, service } = await setup()

    expect(
      await service.setProductAvailability(
        context,
        asProductId("product-matriz-orbit"),
        false,
      ),
    ).toEqual({ ok: false, error: "product-not-found" })
    expect(
      await service.duplicateProduct(
        context,
        asProductId("product-matriz-orbit"),
      ),
    ).toEqual({ ok: false, error: "product-not-found" })
  })

  it("validates product input before saving", async () => {
    const { context, service } = await setup()

    expect(
      await service.saveProduct(context, {
        categoryId: asProductCategoryId("category-galaxia-burgers"),
        name: " ",
        description: "Inválido",
        priceCents: -1,
        stockQuantity: -2,
        available: true,
        featured: false,
      }),
    ).toEqual({ ok: false, error: "validation-error" })
  })

  it("requires products.manage for mutations", async () => {
    const { context, service } = await setup()
    const readOnlyContext = {
      ...context,
      permissions: context.permissions.filter(
        (permission) => permission !== "products.manage",
      ),
    }

    expect(
      await service.setProductFeatured(
        readOnlyContext,
        asProductId("product-x-galaxia"),
        false,
      ),
    ).toEqual({ ok: false, error: "permission-denied" })
  })

  it("requires products.view before reading the catalog", async () => {
    const { context, service } = await setup()
    const unauthorizedContext = {
      ...context,
      permissions: context.permissions.filter(
        (permission) => permission !== "products.view",
      ),
    }

    expect(await service.getProducts(unauthorizedContext)).toEqual({
      ok: false,
      error: "permission-denied",
    })
  })
})
