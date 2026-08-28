import { cpSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

const schemas = ["core", "hub", "spot", "seumei", "contracts", "willdash", "ops", "pay"] as const
type SchemaName = (typeof schemas)[number]
type Mode = "deploy" | "test" | "drift"

function run(args: string[], env: NodeJS.ProcessEnv = process.env, input?: string) {
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
  const result = spawnSync(command, ["exec", "prisma", ...args], {
    env,
    shell: false,
    stdio: input === undefined ? "inherit" : ["pipe", "inherit", "inherit"],
    input,
  })
  if (result.status !== 0) throw new Error(`Prisma command failed (${args[0] ?? "unknown"})`)
}

function assertReleaseTable(schema: SchemaName, url: string, expected: "absent" | "present") {
  const expectation = expected === "present"
    ? `IF to_regclass('"${schema}"."__matriz_schema_releases"') IS NULL THEN RAISE EXCEPTION 'Expected release table to exist'; END IF;`
    : `IF to_regclass('"${schema}"."__matriz_schema_releases"') IS NOT NULL THEN RAISE EXCEPTION 'Expected release table to be absent'; END IF;`
  run(
    ["db", "execute", "--stdin", "--schema", join("prisma", schema, "schema.prisma")],
    { ...process.env, [schemaEnvName(schema)]: url },
    `DO $$ BEGIN ${expectation} END $$;`,
  )
}

function withSchema(raw: string, schema: SchemaName) {
  const url = new URL(raw)
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("Migration database URL must use PostgreSQL")
  }
  url.searchParams.set("schema", schema)
  return url.toString()
}

function schemaEnvName(schema: SchemaName) {
  return `${schema.toUpperCase()}_DATABASE_URL`
}

function ciMigrationRoleUrl(raw: string, schema: SchemaName) {
  const url = new URL(raw)
  url.username = `matriz_${schema}_migration`
  url.password = `ci-${schema}-migration`
  url.searchParams.set("schema", schema)
  return url.toString()
}

function migrationUrl(schema: SchemaName) {
  const value = process.env[`${schema.toUpperCase()}_MIGRATION_DATABASE_URL`]
  if (!value) throw new Error(`Missing ${schema.toUpperCase()}_MIGRATION_DATABASE_URL`)
  return withSchema(value, schema)
}

function deploy(schema: SchemaName, url: string, schemaPath = join("prisma", schema, "schema.prisma")) {
  run(["migrate", "deploy", "--schema", schemaPath], {
    ...process.env,
    [schemaEnvName(schema)]: url,
  })
}

function drift(schema: SchemaName, url: string) {
  run([
    "migrate",
    "diff",
    "--from-url",
    url,
    "--to-schema-datamodel",
    join("prisma", schema, "schema.prisma"),
    "--exit-code",
  ], { ...process.env, [schemaEnvName(schema)]: url })
}

function assertSeparateTestDatabases(zeroRaw: string, previousRaw: string) {
  const zero = new URL(zeroRaw)
  const previous = new URL(previousRaw)
  for (const url of [zero, previous]) {
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
      throw new Error("Migration test database URL must use PostgreSQL")
    }
  }
  if (zero.origin !== previous.origin || zero.username !== previous.username || zero.pathname === previous.pathname) {
    throw new Error("Migration tests require two distinct databases on the same disposable PostgreSQL server")
  }
}

function testMatrix() {
  const zeroRaw = process.env.MIGRATION_TEST_ZERO_DATABASE_URL
  const previousRaw = process.env.MIGRATION_TEST_N_MINUS_ONE_DATABASE_URL
  if (!zeroRaw || !previousRaw) {
    throw new Error("Missing disposable migration test database URLs")
  }
  assertSeparateTestDatabases(zeroRaw, previousRaw)

  for (const schema of schemas) deploy(schema, ciMigrationRoleUrl(zeroRaw, schema))
  for (const schema of schemas) drift(schema, ciMigrationRoleUrl(zeroRaw, schema))

  const staging = mkdtempSync(join(tmpdir(), "matriz-n-minus-one-"))
  try {
    for (const schema of schemas) {
      const stagedRoot = join(staging, schema)
      cpSync(join("prisma", schema), stagedRoot, { recursive: true })
      rmSync(join(stagedRoot, "migrations", "202608120002_release_marker"), { recursive: true })
      const url = ciMigrationRoleUrl(previousRaw, schema)
      deploy(schema, url, join(stagedRoot, "schema.prisma"))
      assertReleaseTable(schema, url, "absent")
      deploy(schema, url)
      assertReleaseTable(schema, url, "present")
      drift(schema, url)
    }
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

const mode = process.argv[2] as Mode | undefined
if (mode === "test") testMatrix()
else if (mode === "deploy") for (const schema of schemas) deploy(schema, migrationUrl(schema))
else if (mode === "drift") for (const schema of schemas) drift(schema, migrationUrl(schema))
else throw new Error("Usage: migration-matrix.ts <deploy|test|drift>")
