import { describe, expect, it } from "vitest"
import { storeProducts } from "./store-catalog"

describe("NAEVIA Store catalog", () => {
  it("projects only bounded display metadata from the Hub contract", () => {
    expect(storeProducts({ schemaVersion: "v1", products: [{ productId: "naevia-electron", displayName: "NAEVIA", edition: "Electron", state: "active", release: { version: "1.0.0" } }] })).toEqual([
      { productId: "naevia-electron", name: "NAEVIA", edition: "Electron", state: "active", version: "1.0.0" },
    ])
  })

  it("rejects malformed or unbounded remote data", () => {
    expect(() => storeProducts({ schemaVersion: "v2", products: [] })).toThrow("Catálogo inválido")
    expect(() => storeProducts({ schemaVersion: "v1", products: Array.from({ length: 101 }, () => ({})) })).toThrow("Catálogo inválido")
  })
})
