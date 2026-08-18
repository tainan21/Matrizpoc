import { describe, expect, it } from "vitest"
import { soundCatalog } from "@matriz/design-ui/sounds"

import { filterSoundCatalog } from "./query"

describe("filterSoundCatalog", () => {
  it("filters the semantic catalog by text, category and status", () => {
    expect(filterSoundCatalog(soundCatalog, { query: "pedido" }).map(({ id }) => id)).toEqual([
      "order",
    ])
    expect(filterSoundCatalog(soundCatalog, { category: "system" })).toHaveLength(2)
    expect(filterSoundCatalog(soundCatalog, { status: "available" })).toHaveLength(12)
  })

  it("uses pack membership without exposing physical assets", () => {
    expect(
      filterSoundCatalog(soundCatalog, { packId: "soft" }, { soft: ["success", "error"] }).map(
        ({ id }) => id,
      ),
    ).toEqual(["success", "error"])
  })
})
