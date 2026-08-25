import { describe, expect, it } from "vitest"
import { asUserId } from "@matriz/foundation-types"
import { createInMemoryStore } from "@matriz/platform-storage"
import { asCompanyId } from "../domains/companies/domain/company"
import { asProductId } from "../domains/catalog/domain/catalog"
import { resolveTenantContext } from "../domains/memberships/application/resolve-tenant-context"
import { asMembershipId } from "../domains/memberships/domain/membership"
import { createFixtureMemberships } from "../fixtures/memberships"
import { createBusinessOsRepositories } from "./business-os.repositories"
import { createFixtureCatalogRepository } from "./catalog.repository"

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

describe("fixture catalog repository", () => {
  it("lists only products owned by the bound company", async () => {
    const galaxia = await contextFor("company-galaxia")
    const matriz = await contextFor("company-matriz-labs")
    const repository = createFixtureCatalogRepository({
      memberships: galaxia.memberships,
    })

    const galaxiaCatalog = await repository.bind(galaxia.context)
    const matrizCatalog = await repository.bind(matriz.context)

    expect(galaxiaCatalog).not.toBeNull()
    expect(matrizCatalog).not.toBeNull()
    expect((await galaxiaCatalog!.listProducts()).map((item) => item.name)).toContain(
      "X-Galáxia",
    )
    expect((await galaxiaCatalog!.listProducts()).map((item) => item.name)).not.toContain(
      "Orbit Workspace",
    )
    expect((await matrizCatalog!.listProducts()).map((item) => item.name)).toEqual([
      "Orbit Workspace",
      "Matriz Care",
    ])
  })

  it("does not reveal, mutate or duplicate a product from another company", async () => {
    const galaxia = await contextFor("company-galaxia")
    const repository = createFixtureCatalogRepository({
      memberships: galaxia.memberships,
    })
    const catalog = await repository.bind(galaxia.context)
    const matrizProductId = asProductId("product-matriz-orbit")

    expect(await catalog!.findProduct(matrizProductId)).toBeNull()
    expect(await catalog!.duplicateProduct(matrizProductId)).toBeNull()

    const allFixtures = await createFixtureCatalogRepository({
      memberships: galaxia.memberships,
    }).bind((await contextFor("company-matriz-labs")).context)
    const matrizProduct = await allFixtures!.findProduct(matrizProductId)
    expect(matrizProduct).not.toBeNull()
    expect(
      await catalog!.saveProduct({ ...matrizProduct!, name: "Produto invadido" }),
    ).toBeNull()
  })

  it("refuses a context with a forged membership id", async () => {
    const galaxia = await contextFor("company-galaxia")
    const repository = createFixtureCatalogRepository({
      memberships: galaxia.memberships,
    })

    expect(
      await repository.bind({
        ...galaxia.context,
        membershipId: asMembershipId("membership-forged"),
      }),
    ).toBeNull()
  })

  it("keeps mutations scoped to the repository instance and tenant", async () => {
    const memberships = createFixtureMemberships(demoUserId)
    expect(memberships).toHaveLength(2)
    const galaxia = await contextFor("company-galaxia")
    const repository = createFixtureCatalogRepository({
      memberships: galaxia.memberships,
    })
    const catalog = await repository.bind(galaxia.context)
    const product = await catalog!.findProduct(asProductId("product-milk-shake-oreo"))

    const saved = await catalog!.saveProduct({ ...product!, available: true })

    expect(saved?.available).toBe(true)
    expect(
      (await catalog!.findProduct(asProductId("product-milk-shake-oreo")))?.available,
    ).toBe(true)
  })

  it("shares mutations only when repositories use the same persistence port", async () => {
    const galaxia = await contextFor("company-galaxia")
    const storage = createInMemoryStore()
    const first = createFixtureCatalogRepository({
      memberships: galaxia.memberships,
      storage,
    })
    const firstCatalog = await first.bind(galaxia.context)
    const productId = asProductId("product-milk-shake-oreo")
    const product = await firstCatalog!.findProduct(productId)
    await firstCatalog!.saveProduct({ ...product!, available: true })

    const second = createFixtureCatalogRepository({
      memberships: galaxia.memberships,
      storage,
    })
    const secondCatalog = await second.bind(galaxia.context)

    expect((await secondCatalog!.findProduct(productId))?.available).toBe(true)
  })
})
