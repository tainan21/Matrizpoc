import { describe, expect, it } from "vitest"
import { toStockListViewModel } from "./stock.presenter"

describe("stock presenter", () => {
  it("formats integer base units and honest health", () => {
    const vm = toStockListViewModel([
      { id: "a", tenantId: "secret", name: "Blend", slug: "blend", sku: null, unit: "GRAM", isActive: true, balance: 18000, lowStockThreshold: 3000, version: 2 },
      { id: "b", tenantId: "secret", name: "Pão", slug: "pao", sku: null, unit: "UNIT", isActive: true, balance: 0, lowStockThreshold: 20, version: 1 },
    ])
    expect(vm).toEqual([
      { id: "a", name: "Blend", balance: "18 kg", threshold: "3 kg", health: "healthy", healthLabel: "Saudável", version: 2 },
      { id: "b", name: "Pão", balance: "0 un.", threshold: "20 un.", health: "out", healthLabel: "Sem saldo", version: 1 },
    ])
    expect(JSON.stringify(vm)).not.toContain("secret")
  })
})
