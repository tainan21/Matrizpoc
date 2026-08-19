import { describe, expect, it } from "vitest"
import { manifest } from "./manifest"

describe("Seumei manifest", () => {
  it("owns the Seumei identity and tenant establishment read", () => {
    expect(manifest).toMatchObject({ appId: "seumei", name: "Seumei", primaryRoute: "/" })
    expect(manifest.capabilities.map(({ id }) => id)).toContain("seumei.establishment.read")
  })
})
