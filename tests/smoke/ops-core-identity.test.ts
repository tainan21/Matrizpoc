import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("Core global operator identity", () => {
  const schema = readFileSync(join(process.cwd(), "prisma/core/schema.prisma"), "utf8")

  it("models lifecycle status and global operator roles", () => {
    expect(schema).toContain("enum UserStatus")
    expect(schema).toContain("status              UserStatus")
    expect(schema).toContain("model PlatformOperator")
    expect(schema).toContain("enum PlatformOperatorRole")
    expect(schema).toContain("OWNER")
    expect(schema).toContain("AUDITOR")
  })

  it("ships the operator migration and idempotent owner bootstrap command", () => {
    const migration = readFileSync(join(process.cwd(), "prisma/core/migrations/202608250002_ops_operators/migration.sql"), "utf8")
    const command = readFileSync(join(process.cwd(), "tooling/scripts/bootstrap-ops-owner.ts"), "utf8")
    expect(migration).toContain('CREATE TABLE "platform_operators"')
    expect(command).toContain("MATRIZ_OPS_OWNER_EMAIL")
    expect(command).toContain("upsert")
  })
})
