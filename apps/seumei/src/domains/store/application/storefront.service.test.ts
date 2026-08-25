import { describe, expect, it } from "vitest"
import { asUserId } from "@matriz/foundation-types"
import { createInMemoryStore } from "@matriz/platform-storage"
import { asCompanyId } from "../../companies/domain/company"
import { asProductId, asProductModifierId } from "../../catalog/domain/catalog"
import { resolveTenantContext } from "../../memberships/application/resolve-tenant-context"
import { asOrderId } from "../../orders/domain/order"
import { createBusinessOsRepositories } from "../../../mock/business-os.repositories"
import { createFixtureCatalogRepository } from "../../../mock/catalog.repository"
import { createFixtureOrderRepository } from "../../../mock/order.repository"
import { createFixtureStoreRepository } from "../../../mock/store.repository"
import { createStorefrontService } from "./storefront.service"

const demoUserId = asUserId("user-demo-seumei")

function setup() {
  const storage = createInMemoryStore()
  const business = createBusinessOsRepositories({ demoUserId })
  const catalog = createFixtureCatalogRepository({
    memberships: business.memberships,
    storage,
  })
  const stores = createFixtureStoreRepository({ memberships: business.memberships })
  const orders = createFixtureOrderRepository({
    memberships: business.memberships,
    storage,
    createOrderId: () => asOrderId("order-demo-1001"),
    now: () => "2026-08-24T18:00:00.000Z",
  })
  return {
    business,
    orders,
    service: createStorefrontService({ stores, catalog, orders }),
  }
}

describe("storefront service", () => {
  it("resolves the published store and returns only its available catalog", async () => {
    const { service } = setup()

    const result = await service.getHome("galaxia-burger")

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.store.companyId).toBe(asCompanyId("company-galaxia"))
    expect(result.store.products.map((product) => product.name)).toContain("X-Galáxia")
    expect(result.store.products.map((product) => product.name)).not.toContain("Milk Shake Oreo")
    expect(result.store.products.map((product) => product.name)).not.toContain("Orbit Workspace")
  })

  it("rejects a product from another tenant even when its id is known", async () => {
    const { service } = setup()

    const result = await service.getProduct(
      "galaxia-burger",
      asProductId("product-matriz-orbit"),
    )

    expect(result).toEqual({ ok: false, error: "product-not-found" })
  })

  it("quotes modifiers and quantity with catalog domain pricing", async () => {
    const { service } = setup()

    const result = await service.quoteItem("galaxia-burger", {
      productId: asProductId("product-x-galaxia"),
      modifierIds: [asProductModifierId("modifier-batata-suprema")],
      quantity: 2,
      observation: "Sem cebola",
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.quote.baseCents).toBe(6980)
    expect(result.quote.modifiersCents).toBe(2580)
    expect(result.quote.totalCents).toBe(9560)
    expect(result.quote.unitLabel).toBe("R$ 47,80")
    expect(result.quote.totalLabel).toBe("R$ 95,60")
  })

  it("creates a real order owned by the resolved store tenant", async () => {
    const { business, orders, service } = setup()

    const result = await service.placeOrder("galaxia-burger", {
      customerName: "Lucas Ferreira",
      items: [
        {
          productId: asProductId("product-x-galaxia"),
          modifierIds: [asProductModifierId("modifier-batata-suprema")],
          quantity: 1,
          observation: "Sem cebola",
        },
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.order.companyId).toBe(asCompanyId("company-galaxia"))
    expect(result.order.totalCents).toBe(5370)

    const galaxiaContext = await resolveTenantContext({
      userId: demoUserId,
      requestedCompanyId: asCompanyId("company-galaxia"),
      memberships: business.memberships,
    })
    const matrizContext = await resolveTenantContext({
      userId: demoUserId,
      requestedCompanyId: asCompanyId("company-matriz-labs"),
      memberships: business.memberships,
    })
    if (!galaxiaContext.ok || !matrizContext.ok) throw new Error("fixture-context")

    expect((await (await orders.bind(galaxiaContext.context))!.list())).toHaveLength(1)
    expect((await (await orders.bind(matrizContext.context))!.list())).toHaveLength(0)
  })

  it("does not publish a draft store", async () => {
    const { service } = setup()
    expect(await service.getHome("matriz-labs")).toEqual({
      ok: false,
      error: "store-not-found",
    })
  })
})
