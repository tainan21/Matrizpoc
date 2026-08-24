import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const source = readFileSync(new URL("./commerce.repository.ts", import.meta.url), "utf8")
describe("commerce repository tenancy contract", () => {
  it("derives checkout tenant from a published slug and scopes private ids", () => {
    expect(source).toContain("storeSlug, isPublished: true")
    expect(source).toContain("id: command.variantId, tenantId: publication.tenantId")
    expect(source).toContain("id: orderId, tenantId")
    expect(source).not.toContain("command.tenantId")
  })
  it("uses one serializable transaction and conditional stock decrements", () => {
    expect(source).toContain('isolationLevel: "Serializable"')
    expect(source).toContain("balance: { gte: quantity }")
    expect(source).toContain("orderStockConsumption.create")
  })
})
