import { describe, expect, it } from "vitest"
import { asUserId } from "@matriz/foundation-types"
import { createInMemoryStore } from "@matriz/platform-storage"
import { asCompanyId } from "../../companies/domain/company"
import { asProductId } from "../../catalog/domain/catalog"
import { resolveTenantContext } from "../../memberships/application/resolve-tenant-context"
import { FIXTURE_STORES } from "../../../fixtures/stores"
import { createBusinessOsRepositories } from "../../../mock/business-os.repositories"
import { createFixtureOrderRepository } from "../../../mock/order.repository"
import { createOrdersService } from "./orders.service"

const userId = asUserId("user-demo-seumei")

async function setup() {
  const business = createBusinessOsRepositories({ demoUserId: userId })
  const resolved = await resolveTenantContext({
    userId,
    requestedCompanyId: asCompanyId("company-galaxia"),
    memberships: business.memberships,
  })
  if (!resolved.ok) throw new Error(resolved.error)
  const repository = createFixtureOrderRepository({
    memberships: business.memberships,
    storage: createInMemoryStore(),
    now: () => "2026-08-25T12:45:00.000Z",
  })
  const store = FIXTURE_STORES[0]!
  await repository.create(
    { storeId: store.id, companyId: store.companyId, slug: store.slug, store },
    {
      customerName: "Lucas Ferreira",
      items: [{ productId: asProductId("product-x-galaxia"), productName: "X-Galáxia", quantity: 1, unitPriceCents: 3490, modifierNames: ["Batata Suprema"], modifiersCents: 1290, totalCents: 4780, observation: "Sem cebola" }],
      subtotalCents: 4780,
      deliveryFeeCents: 590,
      totalCents: 5370,
    },
  )
  return { context: resolved.context, service: createOrdersService(repository) }
}

describe("orders service", () => {
  it("lists only orders available through the resolved tenant context", async () => {
    const { context, service } = await setup()
    const result = await service.getOrders(context)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.orders).toHaveLength(1)
    expect(result.orders[0]?.companyId).toBe(context.companyId)
  })

  it("advances an order only through valid operational transitions", async () => {
    const { context, service } = await setup()
    const listed = await service.getOrders(context)
    if (!listed.ok) throw new Error(listed.error)
    const id = listed.orders[0]!.id

    expect((await service.setStatus(context, id, "ready"))).toEqual({ ok: false, error: "invalid-transition" })
    expect((await service.setStatus(context, id, "preparing")).ok).toBe(true)
    expect((await service.setStatus(context, id, "ready")).ok).toBe(true)
    expect((await service.setStatus(context, id, "delivered")).ok).toBe(true)
    expect((await service.setStatus(context, id, "cancelled"))).toEqual({ ok: false, error: "invalid-transition" })
  })
})
