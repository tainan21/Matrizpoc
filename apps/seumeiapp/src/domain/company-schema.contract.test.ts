import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Seumei company persistence contract", () => {
  const schema = readFileSync(
    resolve(process.cwd(), "../../prisma/schemas/seumei.prisma"),
    "utf8",
  )

  it("models company and resumable onboarding with tenant constraints", () => {
    expect(schema).toContain("model Company {")
    expect(schema).toMatch(/tenantId\s+String\s+@unique/)
    expect(schema).toContain("@@unique([createdByUserId, idempotencyKey])")
    expect(schema).toContain("model CompanyOnboarding {")
    expect(schema).toMatch(/companyId\s+String\s+@unique/)
    expect(schema).toMatch(/tenantId\s+String\s+@unique/)
    expect(schema).toMatch(/version\s+Int\s+@default\(1\)/)
  })
})
