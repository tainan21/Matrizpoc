import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const schema = readFileSync(join(root, "prisma/core/schema.prisma"), "utf8")
const migration = readFileSync(
  join(root, "prisma/core/migrations/202608120003_identity_grants/migration.sql"),
  "utf8",
)

describe("core identity authority model", () => {
  it("separates tenant membership from app-specific grants", () => {
    expect(schema).toContain("model TenantMembership")
    expect(schema).toContain("model AppGrant")
    expect(schema).not.toMatch(/model Membership\s*\{/)
    expect(schema).toContain("@@unique([tenantId, userId])")
    expect(schema).toContain("@@unique([membershipId, appId])")
  })

  it("makes grants explicit, revocable and auditable", () => {
    expect(schema).toMatch(/tenantRoles\s+String\[\]/)
    expect(schema).toMatch(/appRoles\s+String\[\]/)
    expect(schema).toMatch(/capabilities\s+String\[\]/)
    expect(schema).toContain("revokedAt")
    expect(schema).toContain("revokedByUserId")
    expect(schema).toContain("model IdentityAuditEvent")
  })

  it("provides a revocable global OIDC client catalog", () => {
    expect(schema).toContain("model OidcClient")
    expect(schema).toMatch(/clientId\s+String\s+@unique/)
    expect(schema).toMatch(/redirectUris\s+String\[\]/)
    expect(schema).toMatch(/revokedAt\s+DateTime\?/)
  })

  it("migrates the empty baseline without preserving app-coupled authority", () => {
    expect(migration).toContain('DROP TABLE "memberships"')
    expect(migration).toContain('CREATE TABLE "tenant_memberships"')
    expect(migration).toContain('CREATE TABLE "app_grants"')
    expect(migration).toContain('CREATE TABLE "oidc_clients"')
    expect(migration).toContain('CREATE TABLE "identity_audit_events"')
  })
})
