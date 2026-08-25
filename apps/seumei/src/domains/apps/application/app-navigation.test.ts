import { describe, expect, it } from "vitest"
import { buildAppNavigation } from "./app-navigation"

describe("app navigation contributions", () => {
  it("builds Products navigation from its typed registry definition", () => {
    expect(
      buildAppNavigation("products", "/c/galaxia-burger/apps/products"),
    ).toEqual([
      {
        id: "products",
        label: "Produtos",
        href: "/c/galaxia-burger/apps/products",
        icon: "package",
      },
      {
        id: "categories",
        label: "Categorias",
        href: "/c/galaxia-burger/apps/products/categories",
      },
    ])
  })

  it("returns no navigation for an unknown app", () => {
    expect(buildAppNavigation("unknown", "/unknown")).toEqual([])
  })
})
