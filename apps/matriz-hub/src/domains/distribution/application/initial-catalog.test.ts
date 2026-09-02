import { describe, expect, it } from "vitest"
import { DistributionService } from "./distribution-service"
import { seedInitialDistributionCatalog } from "./initial-catalog"
import { createMemoryDistributionRepository } from "../integration/memory-distribution-repository"

describe("initial distribution catalog", () => {
  it("contains every current desktop edition and keeps Pay unavailable", async () => {
    const service = new DistributionService(createMemoryDistributionRepository())
    await seedInitialDistributionCatalog(service)
    const products = (await service.catalog()).products

    expect(products.map(({ productId }) => productId)).toEqual(
      expect.arrayContaining([
        "matriz-control-tauri",
        "matriz-control-electron",
        "naevia-electron",
        "matriz-admin-tauri",
        "matriz-ops-tauri",
        "seumei-electron",
        "matriz-workbench-electron",
        "matriz-pay",
        "matriz-uninstall-tauri",
        "matriz-uninstall-electron",
      ]),
    )
    expect(products.find(({ productId }) => productId === "matriz-pay")?.state).toBe("unavailable")
  })
})
