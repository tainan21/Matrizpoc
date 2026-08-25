import { describe, expect, it } from "vitest"
import { asUserId } from "@matriz/foundation-types"
import { createInMemoryStore } from "@matriz/platform-storage"
import { asCompanyId } from "../domains/companies/domain/company"
import { asProductId } from "../domains/catalog/domain/catalog"
import { asStoreId, type StorePublicationContext } from "../domains/store/domain/store"
import { resolveTenantContext } from "../domains/memberships/application/resolve-tenant-context"
import { FIXTURE_STORES } from "../fixtures/stores"
import { createBusinessOsRepositories } from "./business-os.repositories"
import { createFixtureOrderRepository } from "./order.repository"
import { asOrderId, type Order } from "../domains/orders/domain/order"

const demoUserId = asUserId("user-demo-seumei")

async function contextFor(companyId: "company-galaxia" | "company-matriz-labs") {
  const business = createBusinessOsRepositories({ demoUserId })
  const resolution = await resolveTenantContext({
    userId: demoUserId,
    requestedCompanyId: asCompanyId(companyId),
    memberships: business.memberships,
  })
  if (!resolution.ok) throw new Error(resolution.error)
  return { context: resolution.context, memberships: business.memberships }
}

function publication(company: "company-galaxia" | "company-matriz-labs"): StorePublicationContext {
  const store = FIXTURE_STORES.find((candidate) => candidate.companyId === asCompanyId(company))!
  return { storeId: store.id, companyId: store.companyId, slug: store.slug, store }
}

const draft = {
  customerName: "Lucas Ferreira",
  items: [
    {
      productId: asProductId("product-x-galaxia"),
      productName: "X-Galáxia",
      quantity: 1,
      unitPriceCents: 3490,
      modifierNames: ["Batata Suprema"],
      modifiersCents: 1290,
      totalCents: 4780,
      observation: "Sem cebola",
    },
  ],
  subtotalCents: 4780,
  deliveryFeeCents: 590,
  totalCents: 5370,
} as const

describe("fixture order repository", () => {
  it("seeds coherent demo orders once and preserves later persisted changes", async () => {
    const galaxia = await contextFor("company-galaxia")
    const storage = createInMemoryStore()
    const initialOrder: Order = {
      id: asOrderId("order-demo-1254"), companyId: asCompanyId("company-galaxia"), storeId: asStoreId("store-galaxia"), customerName: "Lucas Ferreira", status: "placed", items: draft.items, subtotalCents: 4780, deliveryFeeCents: 590, totalCents: 5370, createdAt: "2026-08-25T12:45:00.000Z", updatedAt: "2026-08-25T12:45:00.000Z",
    }
    const first = createFixtureOrderRepository({ memberships: galaxia.memberships, storage, initialOrders: [initialOrder] })
    const bound = await first.bind(galaxia.context)
    await bound!.setStatus(initialOrder.id, "preparing")

    const reopened = createFixtureOrderRepository({ memberships: galaxia.memberships, storage, initialOrders: [initialOrder] })
    expect((await (await reopened.bind(galaxia.context))!.find(initialOrder.id))?.status).toBe("preparing")
  })

  it("derives tenant and store ownership from the resolved publication", async () => {
    const galaxia = await contextFor("company-galaxia")
    const repository = createFixtureOrderRepository({
      memberships: galaxia.memberships,
      storage: createInMemoryStore(),
    })

    const order = await repository.create(publication("company-galaxia"), draft)

    expect(order.companyId).toBe(asCompanyId("company-galaxia"))
    expect(order.storeId).toBe(asStoreId("store-galaxia"))
  })

  it("prevents Company A from reading or updating Company B orders", async () => {
    const galaxia = await contextFor("company-galaxia")
    const matriz = await contextFor("company-matriz-labs")
    const repository = createFixtureOrderRepository({
      memberships: galaxia.memberships,
      storage: createInMemoryStore(),
    })
    const foreign = await repository.create(publication("company-matriz-labs"), draft)
    const galaxiaOrders = await repository.bind(galaxia.context)
    const matrizOrders = await repository.bind(matriz.context)

    expect(await galaxiaOrders!.find(foreign.id)).toBeNull()
    expect(await galaxiaOrders!.setStatus(foreign.id, "preparing")).toBeNull()
    expect((await matrizOrders!.find(foreign.id))?.companyId).toBe(
      asCompanyId("company-matriz-labs"),
    )
  })
})
