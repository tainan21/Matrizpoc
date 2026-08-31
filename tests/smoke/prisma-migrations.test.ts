import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const schemas = ["core", "hub", "spot", "seumei", "contracts", "willdash", "ops", "pay"] as const
const databaseUrlNames = {
  core: "CORE_DATABASE_URL",
  hub: "HUB_DATABASE_URL",
  spot: "SPOT_DATABASE_URL",
  seumei: "SEUMEI_DATABASE_URL",
  contracts: "CONTRACTS_DATABASE_URL",
  willdash: "WILLDASH_DATABASE_URL",
  ops: "OPS_DATABASE_URL",
  pay: "PAY_DATABASE_URL",
} as const

describe("independent Prisma migration roots", () => {
  it("keeps the MFA transports default aligned with the deployed migration", () => {
    const schema = readFileSync(join(root, "prisma", "core", "schema.prisma"), "utf8")
    expect(schema).toMatch(/transports\s+String\[\]\s+@default\(\[\]\)/)
  })

  it.each(schemas)("keeps %s schema and versioned migrations together", (schema) => {
    const schemaPath = join(root, "prisma", schema, "schema.prisma")
    const baselinePath = join(
      root,
      "prisma",
      schema,
      "migrations",
      "202608120001_baseline",
      "migration.sql",
    )
    const upgradePath = join(
      root,
      "prisma",
      schema,
      "migrations",
      "202608120002_release_marker",
      "migration.sql",
    )

    expect(readFileSync(schemaPath, "utf8")).toContain(`env("${databaseUrlNames[schema]}")`)
    const baseline = readFileSync(baselinePath, "utf8")
    const upgrade = readFileSync(upgradePath, "utf8")
    const schemaDeclaration = baseline.indexOf(`CREATE SCHEMA IF NOT EXISTS \"${schema}\"`)
    const searchPath = baseline.indexOf(`SET search_path TO \"${schema}\"`)
    const firstObject = [baseline.indexOf("CREATE TYPE"), baseline.indexOf("CREATE TABLE")]
      .filter((position) => position >= 0)
      .sort((left, right) => left - right)[0]

    expect(schemaDeclaration).toBeGreaterThanOrEqual(0)
    expect(searchPath).toBeGreaterThan(schemaDeclaration)
    expect(firstObject).toBeGreaterThan(searchPath)
    expect(upgrade).toContain('CREATE TABLE "__matriz_schema_releases"')
    expect(upgrade).not.toContain("SELECT 1")
    expect(readFileSync(schemaPath, "utf8")).toContain('@@map("__matriz_schema_releases")')
  })

  it("exposes from-zero, N-1, deploy and drift gates", () => {
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>
    }
    const workflow = readFileSync(join(root, ".github", "workflows", "ci.yml"), "utf8")

    expect(packageJson.scripts["prisma:migrate:deploy"]).toContain("migration-matrix.ts deploy")
    expect(packageJson.scripts["prisma:migrate:test"]).toContain("migration-matrix.ts test")
    expect(packageJson.scripts["prisma:migrate:drift"]).toContain("migration-matrix.ts drift")
    expect(workflow).toContain("Run Prisma migration matrix")
    expect(workflow).toContain("pnpm prisma:migrate:test")
  })

  it("fails closed unless migration-only credentials are supplied", () => {
    const runner = readFileSync(join(root, "tooling", "scripts", "migration-matrix.ts"), "utf8")

    expect(runner).toContain("_MIGRATION_DATABASE_URL")
    expect(runner).not.toContain("process.env.DATABASE_URL")
    expect(runner).toContain("Missing disposable migration test database URLs")
    expect(runner).toContain("two distinct databases")
    expect(runner).toContain("assertReleaseTable")
    expect(runner).toContain("Expected release table to be absent")
    expect(runner).toContain("Expected release table to exist")
  })

  it("prepares every migration role with database CREATE permission", () => {
    const preparation = readFileSync(
      join(root, "tooling", "sql", "prepare-ci-runtime-roles.sql"),
      "utf8",
    )

    expect(preparation).toContain("'ops', 'pay'")
    expect(preparation).toContain("GRANT CREATE ON DATABASE")
    expect(preparation).toContain("current_database()")
  })

  it("keeps the contracts template relation aligned with its migration", () => {
    const contractsSchema = readFileSync(join(root, "prisma", "contracts", "schema.prisma"), "utf8")

    expect(contractsSchema).toContain(
      "@relation(fields: [tenantId, templateId], references: [tenantId, id], onDelete: NoAction)",
    )
  })

  it("keeps the CI forced-RLS inventory aligned with the consolidated schemas", () => {
    const verification = readFileSync(join(root, "tooling", "sql", "verify-tenant-rls.sql"), "utf8")

    expect(verification).toContain("actual <> 0")
    expect(verification).toContain("Found % tenantId tables without forced RLS")
    expect(verification.match(/ON CONFLICT \("tenantId"\) DO UPDATE SET id=EXCLUDED\.id/g)).toHaveLength(3)
  })
})
