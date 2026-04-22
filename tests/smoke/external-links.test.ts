import { describe, it, expect } from "vitest"
import { createExternalLinkStore } from "@matriz/integration-external-links"

describe("smoke: external-links", () => {
  it("createLink persists a link with required shape", () => {
    const store = createExternalLinkStore()
    const link = store.create({
      tenantId: "tenant-acme",
      localApp: "contracts",
      localEntityType: "contract",
      localEntityId: "contract-1",
      externalApp: "spot",
      externalEntityType: "gig",
      externalEntityId: "gig-1",
      relationType: "contract.source",
      snapshot: { title: "Show" },
    })
    expect(link.id).toMatch(/^xlink/)
    expect(link.tenantId).toBe("tenant-acme")
    expect(link.localApp).toBe("contracts")
    expect(link.externalApp).toBe("spot")
    expect(link.createdAt).toMatch(/\d{4}-\d{2}-\d{2}T/)
  })

  it("findLinksFor filters by app and entity", () => {
    const store = createExternalLinkStore()
    store.create({
      tenantId: "tenant-a",
      localApp: "contracts",
      localEntityType: "contract",
      localEntityId: "c1",
      externalApp: "spot",
      externalEntityType: "gig",
      externalEntityId: "g1",
      relationType: "contract.source",
    })
    store.create({
      tenantId: "tenant-a",
      localApp: "contracts",
      localEntityType: "contract",
      localEntityId: "c2",
      externalApp: "seumei",
      externalEntityType: "establishment",
      externalEntityId: "e1",
      relationType: "contract.source",
    })
    const spotLinks = store.findLinksFor({ externalApp: "spot" })
    expect(spotLinks).toHaveLength(1)
    expect(spotLinks[0]?.externalEntityId).toBe("g1")

    const byEntity = store.findLinksFor({ externalApp: "seumei", externalEntityId: "e1" })
    expect(byEntity).toHaveLength(1)
  })

  it("snapshot survives roundtrip unchanged", () => {
    const store = createExternalLinkStore()
    const snap = { title: "Show", nested: { venue: "Matriz", fee: 1500 } }
    const link = store.create({
      tenantId: "tenant-a",
      localApp: "contracts",
      localEntityType: "contract",
      localEntityId: "c1",
      externalApp: "spot",
      externalEntityType: "gig",
      externalEntityId: "g1",
      relationType: "contract.source",
      snapshot: snap,
    })
    expect(link.snapshot).toEqual(snap)
    const loaded = store.get(link.id)
    expect(loaded?.snapshot).toEqual(snap)
  })
})
