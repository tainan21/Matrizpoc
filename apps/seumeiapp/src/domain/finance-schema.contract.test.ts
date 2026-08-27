import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const root = resolve(process.cwd(), "../..")
const schema = readFileSync(resolve(root, "prisma/seumei/schema.prisma"), "utf8")
const migration = readFileSync(resolve(root, "prisma/seumei/migrations/202608250001_consolidated_models/migration.sql"), "utf8")

describe("Seumei essential finance persistence contract", () => {
  it.each(["FinancialEntry", "FinancialEntryEvent"])("defines %s", (model) => {
    expect(schema).toContain(`model ${model} {`)
  })

  it("makes order receipts and idempotency unique inside the tenant", () => {
    expect(schema).toContain("@@unique([tenantId, orderId])")
    expect(schema).toContain("@@unique([tenantId, idempotencyKey])")
    expect(schema).toContain("@@unique([tenantId, entryNumber])")
    expect(schema).toContain("financeEntry FinancialEntry?")
  })

  it("enforces monetary, origin and paid-state invariants in PostgreSQL", () => {
    expect(migration).toContain('CHECK ("amountCents" > 0)')
    expect(migration).toContain("financial_entries_origin_order_check")
    expect(migration).toContain("financial_entries_status_paid_check")
    expect(migration).toContain("financial_entries_due_competence_check")
  })
})
