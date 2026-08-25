import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Seumei catalog persistence contract", () => {
  const schema = readFileSync(
    resolve(process.cwd(), "../../prisma/schemas/seumei.prisma"),
    "utf8",
  )

  it("models tenant-scoped categories, products and relational variants", () => {
    expect(schema).toContain("model ProductCategory {")
    expect(schema).toContain("model Product {")
    expect(schema).toContain("model ProductVariant {")
    expect(schema).toContain("@@unique([tenantId, slug])")
    expect(schema).toContain("@@unique([tenantId, sku])")
    expect(schema).toMatch(/priceCents\s+Int/)
    expect(schema).toMatch(/version\s+Int\s+@default\(1\)/)
    expect(schema).not.toMatch(/price\s+Float/)
  })
})
