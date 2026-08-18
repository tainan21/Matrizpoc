import { describe, expect, it } from "vitest"
import { manifest } from "./manifest"

describe("MatrizLib manifest", () => {
  it("declares sounds as a public route and capability", () => {
    expect(manifest.appId).toBe("matrizlib")
    expect(manifest.routes.map((route) => route.path)).toEqual([
      "/",
      "/components",
      "/components/[slug]",
      "/themes",
      "/sounds",
      "/architecture",
    ])
    expect(manifest.capabilities.map((capability) => capability.id)).toContain(
      "matrizlib.sounds.read",
    )
    expect(manifest.description).toMatch(/componentes, temas e sons/i)
  })
})
