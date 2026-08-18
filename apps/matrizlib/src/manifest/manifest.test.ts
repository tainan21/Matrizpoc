import { describe, expect, it } from "vitest"
import { manifest } from "./manifest"

describe("MatrizLib manifest", () => {
  it("declares the five public MatrizLib routes", () => {
    expect(manifest.appId).toBe("matrizlib")
    expect(manifest.routes.map((route) => route.path)).toEqual([
      "/",
      "/components",
      "/components/[slug]",
      "/themes",
      "/architecture",
    ])
  })
})
