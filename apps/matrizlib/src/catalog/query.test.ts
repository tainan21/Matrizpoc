import { describe, expect, it } from "vitest"
import { componentCatalog } from "./component-catalog"
import { filterComponentCatalog, findComponentBySlug } from "./query"

describe("catalog queries", () => {
  it("filters by text, category, and stage together", () => {
    expect(
      filterComponentCatalog(componentCatalog, {
        query: "button",
        category: "input",
        stage: "available",
      }).map((entry) => entry.name),
    ).toEqual(["Button"])
  })

  it("matches normalized names, IDs, descriptions, and canonical tags", () => {
    expect(filterComponentCatalog(componentCatalog, { query: "  C099 " })[0]?.name).toBe(
      "TenantSwitcher",
    )
    expect(filterComponentCatalog(componentCatalog, { query: "TEXT-ENTRY" })[0]?.name).toBe(
      "Input",
    )
    expect(filterComponentCatalog(componentCatalog, { query: "consistent semantic gap" })[0]?.name).toBe(
      "Stack",
    )
  })

  it("returns no entries when one combined condition does not match", () => {
    expect(
      filterComponentCatalog(componentCatalog, {
        query: "button",
        category: "input",
        stage: "candidate",
      }),
    ).toEqual([])
  })

  it("finds a component by its exact audited slug", () => {
    expect(findComponentBySlug("theme-controller")?.id).toBe("C019")
    expect(findComponentBySlug("Theme-Controller")).toBeUndefined()
    expect(findComponentBySlug("theme-swatches")).toBeUndefined()
  })

  it("preserves catalog order and does not mutate the input", () => {
    const before = componentCatalog.map((entry) => entry.id)
    const result = filterComponentCatalog(componentCatalog, { stage: "candidate" })

    expect(result[0]?.id).toBe("C005")
    expect(componentCatalog.map((entry) => entry.id)).toEqual(before)
  })
})
