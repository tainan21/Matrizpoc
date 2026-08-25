import { describe, expect, it } from "vitest"
import { asUserId } from "@matriz/foundation-types"
import { asCompanyId } from "../domains/companies/domain/company"
import { resolveTenantContext } from "../domains/memberships/application/resolve-tenant-context"
import { createBusinessOsRepositories } from "./business-os.repositories"
import { createFixtureStoreRepository } from "./store.repository"

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

describe("fixture store repository", () => {
  it("resolves a published slug to its trusted company context", async () => {
    const galaxia = await contextFor("company-galaxia")
    const repository = createFixtureStoreRepository({ memberships: galaxia.memberships })

    const publication = await repository.resolvePublished("galaxia-burger")

    expect(publication?.companyId).toBe(asCompanyId("company-galaxia"))
    expect(publication?.store.slug).toBe("galaxia-burger")
  })

  it("does not expose a draft secondary tenant store publicly", async () => {
    const matriz = await contextFor("company-matriz-labs")
    const repository = createFixtureStoreRepository({ memberships: matriz.memberships })

    expect(await repository.resolvePublished("matriz-labs")).toBeNull()
  })

  it("prevents a tenant-bound repository from reading or saving another company store", async () => {
    const galaxia = await contextFor("company-galaxia")
    const matriz = await contextFor("company-matriz-labs")
    const repository = createFixtureStoreRepository({ memberships: galaxia.memberships })
    const galaxiaStore = await repository.bind(galaxia.context)
    const matrizStore = await repository.bind(matriz.context)
    const foreign = await matrizStore!.get()

    expect(foreign).not.toBeNull()
    expect(await galaxiaStore!.find(foreign!.id)).toBeNull()
    expect(await galaxiaStore!.save({ ...foreign!, status: "published" })).toBeNull()
  })
})
