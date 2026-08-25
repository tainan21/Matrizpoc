import { describe, expect, it } from "vitest"
import { asUserId } from "@matriz/foundation-types"
import { createInMemoryStore } from "@matriz/platform-storage"
import { asCompanyId } from "../domains/companies/domain/company"
import { asProductId } from "../domains/catalog/domain/catalog"
import { createDemoSeumeiRuntime } from "./container"

describe("demo Seumei runtime", () => {
  it("keeps catalog mutations in the session runtime and isolates company switches", async () => {
    const userId = asUserId("user-demo-seumei")
    const runtime = createDemoSeumeiRuntime(userId)
    const galaxia = await runtime.businessOs.openCompany(
      userId,
      asCompanyId("company-galaxia"),
    )
    const matriz = await runtime.businessOs.openCompany(
      userId,
      asCompanyId("company-matriz-labs"),
    )
    if (!galaxia.ok || !matriz.ok) throw new Error("Fixture tenant unavailable")

    const changed = await runtime.catalog.setProductAvailability(
      galaxia.workspace.context,
      asProductId("product-milk-shake-oreo"),
      true,
    )
    const revisited = await runtime.catalog.getProducts(
      galaxia.workspace.context,
    )
    const matrizCatalog = await runtime.catalog.getProducts(
      matriz.workspace.context,
    )

    expect(changed.ok).toBe(true)
    expect(revisited.ok).toBe(true)
    expect(matrizCatalog.ok).toBe(true)
    if (!revisited.ok || !matrizCatalog.ok) return
    expect(
      revisited.catalog.rows.find(
        (row) => row.id === "product-milk-shake-oreo",
      )?.available,
    ).toBe(true)
    expect(matrizCatalog.catalog.rows.map((row) => row.name)).toEqual([
      "Orbit Workspace",
      "Matriz Care",
    ])
  })

  it("shares tenant catalog changes with the public storefront through the persistence port", async () => {
    const userId = asUserId("user-demo-seumei")
    const storage = createInMemoryStore()
    const adminRuntime = createDemoSeumeiRuntime(userId, storage)
    const opened = await adminRuntime.businessOs.openCompany(
      userId,
      asCompanyId("company-galaxia"),
    )
    if (!opened.ok) throw new Error("Fixture tenant unavailable")

    await adminRuntime.catalog.setProductAvailability(
      opened.workspace.context,
      asProductId("product-x-galaxia"),
      false,
    )
    const publicRuntime = createDemoSeumeiRuntime(userId, storage)
    const storefront = await publicRuntime.storefront.getHome("galaxia-burger")

    expect(storefront.ok).toBe(true)
    if (!storefront.ok) return
    expect(storefront.store.products.map((product) => product.name)).not.toContain(
      "X-Galáxia",
    )
  })

  it("exposes coherent demo orders only to the authorized company workspace", async () => {
    const userId = asUserId("user-demo-seumei")
    const runtime = createDemoSeumeiRuntime(userId)
    const galaxia = await runtime.businessOs.openCompany(userId, asCompanyId("company-galaxia"))
    const matriz = await runtime.businessOs.openCompany(userId, asCompanyId("company-matriz-labs"))
    if (!galaxia.ok || !matriz.ok) throw new Error("Fixture tenant unavailable")

    const galaxiaOrders = await runtime.ordersOperations.getOrders(galaxia.workspace.context)
    const matrizOrders = await runtime.ordersOperations.getOrders(matriz.workspace.context)

    expect(galaxiaOrders.ok).toBe(true)
    if (galaxiaOrders.ok) expect(galaxiaOrders.orders.map((order) => order.customerName)).toContain("Lucas Ferreira")
    expect(matrizOrders).toEqual({ ok: false, error: "forbidden" })
  })
})
