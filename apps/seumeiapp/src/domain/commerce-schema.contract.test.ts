import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const schema = readFileSync(resolve(process.cwd(), "../../prisma/seumei/schema.prisma"), "utf8")

describe("Seumei commerce persistence contract", () => {
  it.each(["StorePublication", "Customer", "CommerceOrder", "OrderItem", "OrderTimelineEvent", "OrderStockConsumption"])("defines %s", (model) => {
    expect(schema).toContain(`model ${model} {`)
  })

  it("keeps public slugs and commands unique while indexing tenant operations", () => {
    expect(schema).toContain("@@unique([tenantId, idempotencyKey])")
    expect(schema).toContain("@@unique([tenantId, orderNumber])")
    expect(schema).toContain("@@index([tenantId, status, createdAt])")
    expect(schema).toContain("storeSlug")
  })
})
