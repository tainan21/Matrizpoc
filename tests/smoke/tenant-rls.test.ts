import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const schemas = ["core", "hub", "spot", "seumei", "contracts", "willdash"] as const

const expectedTenantTables: Record<(typeof schemas)[number], readonly string[]> = {
  core: [
    "tenant_memberships", "app_grants", "identity_audit_events", "app_registrations",
    "external_links", "onboarding_progress", "app_sessions", "telemetry_records",
  ],
  hub: [
    "doc_documents", "doc_document_versions", "doc_blocks", "doc_chunks", "doc_source_artifacts",
    "doc_conversion_runs", "knowledge_nodes", "knowledge_edges", "doc_entity_mentions", "doc_suggestions",
    "doc_context_packages", "doc_context_package_items", "doc_timeline_events", "doc_mcp_resource_snapshots",
    "doc_export_artifacts", "doc_task_candidates", "doc_governance_candidates", "doc_actor_runs", "doc_access_policies",
  ],
  spot: ["bands", "artist_profiles", "gigs", "gig_bookings", "spot_preferences"],
  seumei: ["establishments", "establishment_profiles", "order_drafts", "seumei_preferences"],
  contracts: ["contracts", "contract_parties", "contract_versions", "contract_events", "contract_templates"],
  willdash: ["goals", "reward_rules", "activity_records", "willdash_preferences"],
}

function migration(name: string) {
  return readFileSync(
    join(process.cwd(), "prisma", name, "migrations", "202608120005_runtime_roles_rls", "migration.sql"),
    "utf8",
  )
}

const topologySource = readFileSync(join(process.cwd(), "infrastructure", "neon", "topology.ts"), "utf8")
const ciRoleFixture = readFileSync(join(process.cwd(), "tooling", "sql", "prepare-ci-runtime-roles.sql"), "utf8")
const migrationRunner = readFileSync(join(process.cwd(), "tooling", "scripts", "migration-matrix.ts"), "utf8")
const workflow = readFileSync(join(process.cwd(), ".github", "workflows", "ci.yml"), "utf8")
const runtimeLogin = readFileSync(join(process.cwd(), "tooling", "sql", "verify-runtime-login.sql"), "utf8")

function tenantTablesFromSchema(name: string) {
  const source = readFileSync(join(process.cwd(), "prisma", name, "schema.prisma"), "utf8")
  return [...source.matchAll(/model \w+ \{([\s\S]*?)\n\}/g)]
    .filter((match) => /^\s+tenantId\s+/m.test(match[1]))
    .map((match) => match[1].match(/@@map\("([^"]+)"\)/)?.[1])
    .filter((table): table is string => Boolean(table))
}

describe("mandatory tenant RLS", () => {
  it.each(schemas)("forces a fail-closed policy on every tenant table in %s", (schema) => {
    const sql = migration(schema)
    expect([...tenantTablesFromSchema(schema)].sort()).toEqual([...expectedTenantTables[schema]].sort())
    expect(sql).toContain(`TO "matriz_${schema}_runtime"`)
    expect(sql).toContain("current_setting(''matriz.tenant_id'', true)")
    expect(sql).toContain("NULLIF")
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY")
    expect(sql).toContain("FORCE ROW LEVEL SECURITY")
    expect(sql).toContain("CREATE POLICY")
    expect(sql).toContain(`ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_${schema}_migration"`)
    expect(sql).toContain(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "matriz_${schema}_runtime"`)
    expect(sql).toContain(`GRANT USAGE, SELECT ON SEQUENCES TO "matriz_${schema}_runtime"`)
    expect(sql).toContain("REVOKE ALL ON TABLES FROM PUBLIC")
    expect(sql).toContain("REVOKE ALL ON SEQUENCES FROM PUBLIC")

    for (const table of expectedTenantTables[schema]) {
      expect(sql, `${schema}.${table}: inventory`).toContain(`'${table}'`)
    }
  })

  it.each(schemas)("grants only the owning runtime role in %s", (schema) => {
    const sql = migration(schema)
    for (const other of schemas.filter((candidate) => candidate !== schema)) {
      expect(sql).not.toContain(`matriz_${other}_runtime`)
    }
  })

  it.each(schemas)("keeps the disposable role fixture equivalent to Neon topology for %s", (schema) => {
    expect(topologySource).toContain(`matriz_${"${name}"}_migration`)
    expect(topologySource).toContain(`matriz_${"${name}"}_runtime`)
    expect(ciRoleFixture).toContain("'_migration'")
    expect(ciRoleFixture).toContain("'_runtime'")
    expect(ciRoleFixture).toContain("LOGIN PASSWORD")
    expect(ciRoleFixture).toContain("NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS")
    expect(migrationRunner).toContain("ciMigrationRoleUrl(zeroRaw, schema)")
    expect(migrationRunner).toContain("ciMigrationRoleUrl(previousRaw, schema)")
    expect(schema).toMatch(/^(core|hub|spot|seumei|contracts|willdash)$/)
    expect(workflow).toContain(`matriz_${schema}_migration:ci-${schema}-migration`)
  })

  it("derives the disposable role names from the same exhaustive schema set", () => {
    const topologySchemas = topologySource.match(/MATRIZ_SCHEMAS = \[([\s\S]*?)\] as const/)?.[1]
      .match(/"([^"]+)"/g)?.map((value) => value.slice(1, -1)) ?? []
    const fixtureSchemas = ciRoleFixture.match(/FOREACH app_name IN ARRAY ARRAY\[([^\]]+)\]/)?.[1]
      .match(/'([^']+)'/g)?.map((value) => value.slice(1, -1)) ?? []
    expect(fixtureSchemas).toEqual(topologySchemas)
  })

  it("authenticates every runtime login instead of relying only on SET ROLE", () => {
    expect(workflow).toContain("for app in core hub spot seumei contracts willdash")
    expect(workflow).toContain('PGPASSWORD="ci-${app}-runtime" psql')
    expect(runtimeLogin).toContain("session_user")
    expect(runtimeLogin).toContain("current_user")
  })

  it("keeps the closed core global whitelist outside tenant RLS", () => {
    const sql = migration("core")
    for (const table of ["users", "auth_accounts", "auth_verification_challenges", "oidc_clients"]) {
      expect(sql).not.toContain(`'${table}'`)
    }
    expect(sql).toContain(`ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY`)
    expect(sql).toContain(`"id" = NULLIF(current_setting('matriz.tenant_id', true), '')`)
  })

  it("classifies every core table as tenant-column, tenant-root, global whitelist or migration metadata", () => {
    const source = readFileSync(join(process.cwd(), "prisma", "core", "schema.prisma"), "utf8")
    const tables = [...source.matchAll(/model \w+ \{([\s\S]*?)\n\}/g)].map((match) => ({
      table: match[1].match(/@@map\("([^"]+)"\)/)?.[1] ?? "",
      tenantColumn: /^\s+tenantId\s+/m.test(match[1]),
    }))
    const explicitlyGlobal = new Set(["users", "auth_accounts", "auth_verification_challenges", "oidc_clients"])
    const metadata = new Set(["__matriz_schema_releases"])
    const unclassified = tables.filter(({ table, tenantColumn }) =>
      !tenantColumn && table !== "tenants" && !explicitlyGlobal.has(table) && !metadata.has(table),
    )
    expect(unclassified).toEqual([])
  })
})
