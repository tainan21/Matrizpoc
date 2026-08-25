import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Core membership invitation persistence contract", () => {
  const schema = readFileSync(
    resolve(process.cwd(), "../../prisma/core/schema.prisma"),
    "utf8",
  )

  it("models app-scoped hashed invitations with explicit lifecycle", () => {
    expect(schema).toContain("model MembershipInvitation {")
    expect(schema).toMatch(/tokenHash\s+String\s+@unique/)
    expect(schema).toContain("@@unique([tenantId, appId, email])")
    expect(schema).toContain("enum MembershipInvitationStatus")
    expect(schema).not.toMatch(/^\s*token\s+String/m)
  })
})
