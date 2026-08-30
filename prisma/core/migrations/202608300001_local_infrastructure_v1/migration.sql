SET search_path TO "core";

GRANT USAGE ON SCHEMA "core" TO "matriz_core_runtime";
REVOKE ALL ON ALL TABLES IN SCHEMA "core" FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "core" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "core" TO "matriz_core_runtime";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "core" TO "matriz_core_runtime";

ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_core_migration" IN SCHEMA "core" REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_core_migration" IN SCHEMA "core" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "matriz_core_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_core_migration" IN SCHEMA "core" REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_core_migration" IN SCHEMA "core" GRANT USAGE, SELECT ON SEQUENCES TO "matriz_core_runtime";

DO $$
DECLARE
  tenant_table record;
  policy_name text;
BEGIN
  FOR tenant_table IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'core' AND column_name = 'tenantId'
    ORDER BY table_name
  LOOP
    policy_name := tenant_table.table_name || '_tenant_isolation';
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'core', tenant_table.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'core', tenant_table.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_name, 'core', tenant_table.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I TO %I USING ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), '''')) WITH CHECK ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), ''''))',
      policy_name,
      'core',
      tenant_table.table_name,
      'matriz_core_runtime'
    );
  END LOOP;
END $$;

-- Release: local-infrastructure-v1. Applied state is authoritative in
-- this schema's _prisma_migrations ledger; no runtime writes a marker.
