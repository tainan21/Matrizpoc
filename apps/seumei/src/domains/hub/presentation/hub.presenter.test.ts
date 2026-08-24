import { describe, expect, it } from "vitest"
import { asUserId } from "@matriz/foundation-types"
import { createBusinessOsService } from "../application/hub.service"
import { createBusinessOsRepositories } from "../../../mock/business-os.repositories"

describe("Business OS Hub presentation", () => {
  it("presents each company with only its authorized installed apps", async () => {
    const demoUserId = asUserId("user-demo-seumei")
    const service = createBusinessOsService(
      createBusinessOsRepositories({ demoUserId }),
    )
    const model = await service.getHub(demoUserId)

    const galaxia = model.companies.find(
      (company) => company.slug === "galaxia-burger",
    )!
    const matriz = model.companies.find(
      (company) => company.slug === "matriz-labs",
    )!

    expect(galaxia.roleLabel).toBe("Proprietário")
    expect(galaxia.apps.map((app) => app.id)).toContain("store")
    expect(galaxia.apps.map((app) => app.id)).not.toContain("reports")
    expect(matriz.roleLabel).toBe("Administrador")
    expect(matriz.apps.map((app) => app.id)).toContain("reports")
    expect(matriz.apps.map((app) => app.id)).not.toContain("store")
  })

  it("returns an empty Hub for an authenticated user without memberships", async () => {
    const demoUserId = asUserId("user-demo-seumei")
    const service = createBusinessOsService(
      createBusinessOsRepositories({ demoUserId }),
    )

    const model = await service.getHub(asUserId("user-without-memberships"))

    expect(model.companies).toEqual([])
    expect(model.emptyState).toEqual({
      title: "Nenhuma empresa disponível",
      description: "Esta conta ainda não possui memberships ativas no Seumei.",
    })
  })
})
