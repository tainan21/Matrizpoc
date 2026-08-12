export const MATRIZ_SCHEMAS = [
  "core",
  "hub",
  "spot",
  "seumei",
  "contracts",
  "willdash",
] as const

export type MatrizSchema = (typeof MATRIZ_SCHEMAS)[number]
export type TopologyMode = "dry-run" | "verify" | "apply"

const REQUIRED_PROVIDER_ENV = [
  "NEON_API_KEY",
  "NEON_PROJECT_ID",
  "NEON_PRIMARY_DATABASE_URL",
  "NEON_PROVISIONING_BRANCH_ID",
  "NEON_DATABASE_OWNER_NAME",
] as const

const runtimeGrants = [
  "USAGE_SCHEMA",
  "SELECT_TABLES",
  "INSERT_TABLES",
  "UPDATE_TABLES",
  "DELETE_TABLES",
  "USAGE_SEQUENCES",
] as const

export type Environment = Readonly<Record<string, string | undefined>>

export function parseTopologyMode(args: readonly string[]): TopologyMode {
  if (args.length === 0) return "dry-run"
  if (args.length !== 1) throw new Error("Usage: neon-topology [--dry-run|--verify|--apply]")
  const modes: Record<string, TopologyMode> = {
    "--dry-run": "dry-run",
    "--verify": "verify",
    "--apply": "apply",
  }
  const mode = modes[args[0] ?? ""]
  if (!mode) throw new Error("Usage: neon-topology [--dry-run|--verify|--apply]")
  return mode
}

export function envPrefix(schema: MatrizSchema): string {
  return schema.toUpperCase()
}

export function buildTopologyPlan() {
  return {
    version: 1 as const,
    provider: "neon" as const,
    project: { database: "matriz" },
    ciBranch: {
      name: "matriz-ci",
      lifecycle: "managed-by-ci",
    },
    schemas: MATRIZ_SCHEMAS.map((name) => ({
      name,
      migrationRole: `matriz_${name}_migration`,
      runtimeRole: `matriz_${name}_runtime`,
      migrationUrlEnv: `${envPrefix(name)}_MIGRATION_DATABASE_URL`,
      runtimeUrlEnv: `${envPrefix(name)}_RUNTIME_DATABASE_URL`,
      runtimeGrants: [...runtimeGrants],
    })),
  }
}

export function validateTopologyEnvironment(environment: Environment) {
  const missing = REQUIRED_PROVIDER_ENV.filter((key) => !environment[key]?.trim())
  const owner = environment.NEON_DATABASE_OWNER_NAME?.trim()
  const invalid = owner && !/^[a-z][a-z0-9_]{0,62}$/.test(owner) ? ["NEON_DATABASE_OWNER_NAME"] : []
  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid }
}

export function validateDatabaseUrl(urlValue: string | undefined, expectedHost: string): void {
  if (!urlValue) throw new Error("Required database URL is missing")
  let url: URL
  try {
    url = new URL(urlValue)
  } catch {
    throw new Error("Database URL is invalid")
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") throw new Error("Database URL protocol is invalid")
  if (url.hostname.toLowerCase() !== expectedHost.toLowerCase()) throw new Error("Database URL endpoint mismatch")
  if (decodeURIComponent(url.pathname.replace(/^\//, "")) !== "matriz") throw new Error("Database URL must target matriz")
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/(postgres(?:ql)?:\/\/[^:\s/@]+:)[^@\s/]+@/gi, "$1[REDACTED]@")
    .replace(/((?:api[_-]?key|token|password|secret)\s*[=:]\s*)[^\s,;]+/gi, "$1[REDACTED]")
}

function quoteIdentifier(value: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    throw new Error("Unsafe topology identifier")
  }
  return `"${value}"`
}

export function buildProvisioningSql(): string {
  const statements = [
    "DO $$ BEGIN IF current_database() <> 'matriz' THEN RAISE EXCEPTION 'Refusing topology change outside matriz database'; END IF; END $$;",
    "REVOKE CREATE ON SCHEMA public FROM PUBLIC;",
  ]

  // Create every principal/schema first so the isolation phase is valid on a
  // completely empty database as well as on repeated runs.
  for (const entry of buildTopologyPlan().schemas) {
    const schema = quoteIdentifier(entry.name)
    const migration = quoteIdentifier(entry.migrationRole)
    const runtime = quoteIdentifier(entry.runtimeRole)
    statements.push(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${entry.migrationRole}') THEN CREATE ROLE ${migration} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT; END IF; END $$;`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${entry.runtimeRole}') THEN CREATE ROLE ${runtime} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT; END IF; END $$;`,
      `CREATE SCHEMA IF NOT EXISTS ${schema} AUTHORIZATION ${migration};`,
    )
  }

  for (const entry of buildTopologyPlan().schemas) {
    const schema = quoteIdentifier(entry.name)
    const migration = quoteIdentifier(entry.migrationRole)
    const runtime = quoteIdentifier(entry.runtimeRole)

    statements.push(
      `ALTER ROLE ${migration} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;`,
      `ALTER ROLE ${runtime} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;`,
      `DO $$ DECLARE granted_role text; BEGIN FOR granted_role IN SELECT parent.rolname FROM pg_auth_members membership JOIN pg_roles parent ON parent.oid = membership.roleid JOIN pg_roles member ON member.oid = membership.member WHERE member.rolname IN ('${entry.migrationRole}', '${entry.runtimeRole}') LOOP EXECUTE format('REVOKE %I FROM ${migration}, ${runtime}', granted_role); END LOOP; END $$;`,
      `ALTER SCHEMA ${schema} OWNER TO ${migration};`,
      `REVOKE ALL ON SCHEMA ${schema} FROM PUBLIC, ${migration}, ${runtime};`,
      `REVOKE ALL ON ALL TABLES IN SCHEMA ${schema} FROM PUBLIC, ${migration}, ${runtime};`,
      `REVOKE ALL ON ALL SEQUENCES IN SCHEMA ${schema} FROM PUBLIC, ${migration}, ${runtime};`,
      `REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ${schema} FROM PUBLIC, ${migration}, ${runtime};`,
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${migration} IN SCHEMA ${schema} REVOKE ALL ON TABLES FROM PUBLIC, ${migration}, ${runtime};`,
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${migration} IN SCHEMA ${schema} REVOKE ALL ON SEQUENCES FROM PUBLIC, ${migration}, ${runtime};`,
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${migration} IN SCHEMA ${schema} REVOKE ALL ON FUNCTIONS FROM PUBLIC, ${migration}, ${runtime};`,
      `DO $$ DECLARE rogue_grant record; BEGIN
        FOR rogue_grant IN
          SELECT DISTINCT COALESCE(grantee.rolname, 'PUBLIC') AS grantee
          FROM pg_namespace namespace CROSS JOIN LATERAL aclexplode(namespace.nspacl) acl
          LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee WHERE namespace.nspname = '${entry.name}'
            AND COALESCE(grantee.rolname, 'PUBLIC') NOT IN ('${entry.migrationRole}', '${entry.runtimeRole}')
        LOOP EXECUTE CASE WHEN rogue_grant.grantee = 'PUBLIC' THEN format('REVOKE ALL ON SCHEMA %I FROM PUBLIC', '${entry.name}') ELSE format('REVOKE ALL ON SCHEMA %I FROM %I', '${entry.name}', rogue_grant.grantee) END; END LOOP;
        FOR rogue_grant IN
          SELECT DISTINCT grantee FROM information_schema.table_privileges
          WHERE table_schema = '${entry.name}' AND grantee NOT IN ('${entry.migrationRole}', '${entry.runtimeRole}')
        LOOP EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM %I', '${entry.name}', rogue_grant.grantee); END LOOP;
        FOR rogue_grant IN
          SELECT DISTINCT COALESCE(grantee.rolname, 'PUBLIC') AS grantee
          FROM pg_class object JOIN pg_namespace namespace ON namespace.oid = object.relnamespace
          CROSS JOIN LATERAL aclexplode(object.relacl) acl LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
          WHERE namespace.nspname = '${entry.name}' AND object.relkind = 'S'
            AND COALESCE(grantee.rolname, 'PUBLIC') NOT IN ('${entry.migrationRole}', '${entry.runtimeRole}')
        LOOP EXECUTE CASE WHEN rogue_grant.grantee = 'PUBLIC' THEN format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM PUBLIC', '${entry.name}') ELSE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM %I', '${entry.name}', rogue_grant.grantee) END; END LOOP;
        FOR rogue_grant IN
          SELECT DISTINCT COALESCE(grantee.rolname, 'PUBLIC') AS grantee
          FROM pg_proc object JOIN pg_namespace namespace ON namespace.oid = object.pronamespace
          CROSS JOIN LATERAL aclexplode(object.proacl) acl LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
          WHERE namespace.nspname = '${entry.name}'
        LOOP EXECUTE CASE WHEN rogue_grant.grantee = 'PUBLIC' THEN format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM PUBLIC', '${entry.name}') ELSE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA %I FROM %I', '${entry.name}', rogue_grant.grantee) END; END LOOP;
        FOR rogue_grant IN
          SELECT DISTINCT owner.rolname AS owner_name, defaults.defaclobjtype,
            COALESCE(grantee.rolname, 'PUBLIC') AS grantee
          FROM pg_default_acl defaults JOIN pg_roles owner ON owner.oid = defaults.defaclrole
          JOIN pg_namespace namespace ON namespace.oid = defaults.defaclnamespace
          CROSS JOIN LATERAL aclexplode(defaults.defaclacl) acl LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
          WHERE namespace.nspname = '${entry.name}' AND (owner.rolname <> '${entry.migrationRole}' OR COALESCE(grantee.rolname, 'PUBLIC') <> '${entry.runtimeRole}')
        LOOP EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON %s FROM %s', rogue_grant.owner_name, '${entry.name}', CASE rogue_grant.defaclobjtype WHEN 'r' THEN 'TABLES' WHEN 'S' THEN 'SEQUENCES' ELSE 'FUNCTIONS' END, CASE WHEN rogue_grant.grantee = 'PUBLIC' THEN 'PUBLIC' ELSE quote_ident(rogue_grant.grantee) END); END LOOP;
      END $$;`,
      `GRANT USAGE ON SCHEMA ${schema} TO ${runtime};`,
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${runtime};`,
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO ${runtime};`,
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${migration} IN SCHEMA ${schema} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${runtime};`,
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${migration} IN SCHEMA ${schema} GRANT USAGE, SELECT ON SEQUENCES TO ${runtime};`,
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${migration} IN SCHEMA ${schema} REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, ${migration}, ${runtime};`,
    )

    for (const other of MATRIZ_SCHEMAS.filter((name) => name !== entry.name)) {
      const otherSchema = quoteIdentifier(other)
      statements.push(
        `REVOKE ALL ON SCHEMA ${otherSchema} FROM ${migration}, ${runtime};`,
        `REVOKE ALL ON ALL TABLES IN SCHEMA ${otherSchema} FROM ${migration}, ${runtime};`,
        `REVOKE ALL ON ALL SEQUENCES IN SCHEMA ${otherSchema} FROM ${migration}, ${runtime};`,
        `REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ${otherSchema} FROM ${migration}, ${runtime};`,
      )
    }
  }

  return `${statements.join("\n")}\n`
}

export function buildVerificationSql(): string {
  const expectedSchemas = MATRIZ_SCHEMAS.map((value) => `'${value}'`).join(", ")
  const expectedRoles = buildTopologyPlan().schemas
    .flatMap((entry) => [entry.migrationRole, entry.runtimeRole])
    .map((value) => `'${value}'`)
    .join(", ")

  return `DO $$
DECLARE missing_count integer;
BEGIN
  IF current_database() <> 'matriz' THEN RAISE EXCEPTION 'Matriz topology verification failed: wrong database'; END IF;
  SELECT count(*) INTO missing_count FROM (VALUES (${expectedSchemas.replace(/, /g, "), (")})) AS expected(name)
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.schemata s WHERE s.schema_name = expected.name);
  IF missing_count > 0 THEN RAISE EXCEPTION 'Matriz topology verification failed: missing schema'; END IF;
  SELECT count(*) INTO missing_count FROM (VALUES (${expectedRoles.replace(/, /g, "), (")})) AS expected(name)
    WHERE NOT EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = expected.name);
  IF missing_count > 0 THEN RAISE EXCEPTION 'Matriz topology verification failed: missing role'; END IF;
  SELECT count(*) INTO missing_count FROM pg_roles
    WHERE rolname IN (${expectedRoles})
      AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolreplication OR rolbypassrls);
  IF missing_count > 0 THEN RAISE EXCEPTION 'Matriz topology verification failed: unsafe role attributes'; END IF;
  SELECT count(*) INTO missing_count FROM pg_auth_members membership
    JOIN pg_roles member ON member.oid = membership.member
    WHERE member.rolname IN (${expectedRoles});
  IF missing_count > 0 THEN RAISE EXCEPTION 'Matriz topology verification failed: role membership exists'; END IF;
END $$;
${buildTopologyPlan().schemas.map((entry) => {
    const otherChecks = MATRIZ_SCHEMAS.filter((name) => name !== entry.name)
      .map((other) => `(has_schema_privilege('${entry.runtimeRole}', '${other}', 'USAGE') OR has_schema_privilege('${entry.migrationRole}', '${other}', 'USAGE'))`)
      .join(" OR ")
    return `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace n JOIN pg_roles owner ON owner.oid = n.nspowner WHERE n.nspname = '${entry.name}' AND owner.rolname = '${entry.migrationRole}') THEN RAISE EXCEPTION 'Matriz topology verification failed: schema owner'; END IF;
  IF has_schema_privilege('PUBLIC', '${entry.name}', 'USAGE') OR has_schema_privilege('PUBLIC', '${entry.name}', 'CREATE') THEN RAISE EXCEPTION 'Matriz topology verification failed: public schema ACL'; END IF;
  IF NOT has_schema_privilege('${entry.runtimeRole}', '${entry.name}', 'USAGE') THEN RAISE EXCEPTION 'Matriz topology verification failed: runtime own-schema ACL'; END IF;
  IF has_schema_privilege('${entry.runtimeRole}', '${entry.name}', 'CREATE') THEN RAISE EXCEPTION 'Matriz topology verification failed: runtime schema CREATE'; END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace namespace CROSS JOIN LATERAL aclexplode(namespace.nspacl) acl LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee WHERE namespace.nspname = '${entry.name}' AND (COALESCE(grantee.rolname, 'PUBLIC') NOT IN ('${entry.migrationRole}', '${entry.runtimeRole}') OR (grantee.rolname = '${entry.runtimeRole}' AND acl.privilege_type <> 'USAGE'))) THEN RAISE EXCEPTION 'Matriz topology verification failed: schema unexpected grantee'; END IF;
  IF ${otherChecks} THEN RAISE EXCEPTION 'Matriz topology verification failed: runtime cross-schema ACL'; END IF;
  IF (SELECT count(DISTINCT acl.privilege_type) FROM pg_default_acl defaults
    JOIN pg_roles owner ON owner.oid = defaults.defaclrole
    JOIN pg_namespace namespace ON namespace.oid = defaults.defaclnamespace
    CROSS JOIN LATERAL aclexplode(defaults.defaclacl) acl
    JOIN pg_roles grantee ON grantee.oid = acl.grantee
    WHERE owner.rolname = '${entry.migrationRole}' AND namespace.nspname = '${entry.name}'
      AND grantee.rolname = '${entry.runtimeRole}' AND defaults.defaclobjtype = 'r'
      AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) <> 4 THEN RAISE EXCEPTION 'Matriz topology verification failed: table default ACL'; END IF;
  IF EXISTS (SELECT 1 FROM pg_default_acl defaults JOIN pg_roles owner ON owner.oid = defaults.defaclrole JOIN pg_namespace namespace ON namespace.oid = defaults.defaclnamespace CROSS JOIN LATERAL aclexplode(defaults.defaclacl) acl LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee WHERE owner.rolname = '${entry.migrationRole}' AND namespace.nspname = '${entry.name}' AND defaults.defaclobjtype = 'r' AND (acl.grantee = 0 OR grantee.rolname IN ('${entry.runtimeRole}', '${entry.migrationRole}')) AND (grantee.rolname IS DISTINCT FROM '${entry.runtimeRole}' OR acl.privilege_type NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE'))) THEN RAISE EXCEPTION 'Matriz topology verification failed: extra table default ACL'; END IF;
  IF (SELECT count(DISTINCT acl.privilege_type) FROM pg_default_acl defaults
    JOIN pg_roles owner ON owner.oid = defaults.defaclrole
    JOIN pg_namespace namespace ON namespace.oid = defaults.defaclnamespace
    CROSS JOIN LATERAL aclexplode(defaults.defaclacl) acl
    JOIN pg_roles grantee ON grantee.oid = acl.grantee
    WHERE owner.rolname = '${entry.migrationRole}' AND namespace.nspname = '${entry.name}'
      AND grantee.rolname = '${entry.runtimeRole}' AND defaults.defaclobjtype = 'S'
      AND acl.privilege_type IN ('USAGE', 'SELECT')
  ) <> 2 THEN RAISE EXCEPTION 'Matriz topology verification failed: sequence default ACL'; END IF;
  IF EXISTS (SELECT 1 FROM pg_default_acl defaults JOIN pg_roles owner ON owner.oid = defaults.defaclrole JOIN pg_namespace namespace ON namespace.oid = defaults.defaclnamespace CROSS JOIN LATERAL aclexplode(defaults.defaclacl) acl LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee WHERE owner.rolname = '${entry.migrationRole}' AND namespace.nspname = '${entry.name}' AND defaults.defaclobjtype = 'S' AND (acl.grantee = 0 OR grantee.rolname IN ('${entry.runtimeRole}', '${entry.migrationRole}')) AND (grantee.rolname IS DISTINCT FROM '${entry.runtimeRole}' OR acl.privilege_type NOT IN ('USAGE', 'SELECT'))) THEN RAISE EXCEPTION 'Matriz topology verification failed: extra sequence default ACL'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_default_acl defaults
    JOIN pg_roles owner ON owner.oid = defaults.defaclrole
    JOIN pg_namespace namespace ON namespace.oid = defaults.defaclnamespace
    CROSS JOIN LATERAL aclexplode(defaults.defaclacl) acl
    LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
    WHERE owner.rolname = '${entry.migrationRole}' AND namespace.nspname = '${entry.name}'
      AND defaults.defaclobjtype = 'f' AND acl.privilege_type = 'EXECUTE'
      AND (acl.grantee = 0 OR grantee.rolname IN ('${entry.migrationRole}', '${entry.runtimeRole}'))
  ) THEN RAISE EXCEPTION 'Matriz topology verification failed: function default ACL'; END IF;
  IF EXISTS (SELECT 1 FROM pg_default_acl defaults JOIN pg_roles owner ON owner.oid = defaults.defaclrole JOIN pg_namespace namespace ON namespace.oid = defaults.defaclnamespace CROSS JOIN LATERAL aclexplode(defaults.defaclacl) acl LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee WHERE namespace.nspname = '${entry.name}' AND (owner.rolname <> '${entry.migrationRole}' OR COALESCE(grantee.rolname, 'PUBLIC') <> '${entry.runtimeRole}' OR defaults.defaclobjtype NOT IN ('r', 'S') OR (defaults.defaclobjtype = 'r' AND acl.privilege_type NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')) OR (defaults.defaclobjtype = 'S' AND acl.privilege_type NOT IN ('USAGE', 'SELECT')))) THEN RAISE EXCEPTION 'Matriz topology verification failed: default ACL unexpected grantee'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_privileges WHERE grantee = '${entry.runtimeRole}' AND table_schema IN (${MATRIZ_SCHEMAS.filter((name) => name !== entry.name).map((name) => `'${name}'`).join(", ")})) THEN RAISE EXCEPTION 'Matriz topology verification failed: runtime cross-schema table ACL'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.usage_privileges WHERE grantee = '${entry.runtimeRole}' AND object_schema IN (${MATRIZ_SCHEMAS.filter((name) => name !== entry.name).map((name) => `'${name}'`).join(", ")})) THEN RAISE EXCEPTION 'Matriz topology verification failed: runtime cross-schema sequence ACL'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_privileges WHERE grantee IN ('${entry.runtimeRole}', '${entry.migrationRole}') AND table_schema IN (${MATRIZ_SCHEMAS.filter((name) => name !== entry.name).map((name) => `'${name}'`).join(", ")})) THEN RAISE EXCEPTION 'Matriz topology verification failed: cross-schema table ACL'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_schema IN (${MATRIZ_SCHEMAS.filter((name) => name !== entry.name).map((name) => `'${name}'`).join(", ")}) AND (has_sequence_privilege('${entry.runtimeRole}', quote_ident(sequence_schema) || '.' || quote_ident(sequence_name), 'USAGE,SELECT,UPDATE') OR has_sequence_privilege('${entry.migrationRole}', quote_ident(sequence_schema) || '.' || quote_ident(sequence_name), 'USAGE,SELECT,UPDATE'))) THEN RAISE EXCEPTION 'Matriz topology verification failed: cross-schema sequence ACL'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.routine_privileges WHERE grantee IN ('PUBLIC', '${entry.runtimeRole}', '${entry.migrationRole}') AND routine_schema IN (${MATRIZ_SCHEMAS.map((name) => `'${name}'`).join(", ")})) THEN RAISE EXCEPTION 'Matriz topology verification failed: function ACL'; END IF;
  IF EXISTS (SELECT 1 FROM pg_proc object JOIN pg_namespace namespace ON namespace.oid = object.pronamespace CROSS JOIN LATERAL aclexplode(object.proacl) acl WHERE namespace.nspname = '${entry.name}') THEN RAISE EXCEPTION 'Matriz topology verification failed: function unexpected grantee'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_privileges WHERE grantee = '${entry.runtimeRole}' AND table_schema = '${entry.name}' AND privilege_type NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')) THEN RAISE EXCEPTION 'Matriz topology verification failed: runtime extra table ACL'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_privileges WHERE grantee = 'PUBLIC' AND table_schema = '${entry.name}') THEN RAISE EXCEPTION 'Matriz topology verification failed: public table ACL'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_privileges WHERE table_schema = '${entry.name}' AND grantee NOT IN ('${entry.migrationRole}', '${entry.runtimeRole}')) THEN RAISE EXCEPTION 'Matriz topology verification failed: table unexpected grantee'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.sequences sequences WHERE sequence_schema = '${entry.name}' AND has_sequence_privilege('${entry.runtimeRole}', quote_ident(sequence_schema) || '.' || quote_ident(sequence_name), 'UPDATE')) THEN RAISE EXCEPTION 'Matriz topology verification failed: runtime extra sequence ACL'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.sequences sequences WHERE sequence_schema = '${entry.name}' AND has_sequence_privilege('PUBLIC', quote_ident(sequence_schema) || '.' || quote_ident(sequence_name), 'USAGE,SELECT,UPDATE')) THEN RAISE EXCEPTION 'Matriz topology verification failed: public sequence ACL'; END IF;
  IF EXISTS (SELECT 1 FROM pg_class object JOIN pg_namespace namespace ON namespace.oid = object.relnamespace CROSS JOIN LATERAL aclexplode(object.relacl) acl LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee WHERE namespace.nspname = '${entry.name}' AND object.relkind = 'S' AND COALESCE(grantee.rolname, 'PUBLIC') NOT IN ('${entry.migrationRole}', '${entry.runtimeRole}')) THEN RAISE EXCEPTION 'Matriz topology verification failed: sequence unexpected grantee'; END IF;
  IF EXISTS (SELECT table_name FROM information_schema.tables tables WHERE table_schema = '${entry.name}' AND table_type = 'BASE TABLE' AND (SELECT count(DISTINCT privilege_type) FROM information_schema.table_privileges privileges WHERE privileges.grantee = '${entry.runtimeRole}' AND privileges.table_schema = tables.table_schema AND privileges.table_name = tables.table_name AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')) <> 4) THEN RAISE EXCEPTION 'Matriz topology verification failed: runtime missing table ACL'; END IF;
  IF EXISTS (SELECT sequence_name FROM information_schema.sequences sequences WHERE sequence_schema = '${entry.name}' AND NOT has_sequence_privilege('${entry.runtimeRole}', quote_ident(sequence_schema) || '.' || quote_ident(sequence_name), 'USAGE,SELECT')) THEN RAISE EXCEPTION 'Matriz topology verification failed: runtime missing sequence ACL'; END IF;
END $$;`
  }).join("\n")}
`
}
