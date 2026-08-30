SET search_path TO "hub";

GRANT USAGE ON SCHEMA "hub" TO "matriz_hub_runtime";
REVOKE ALL ON ALL TABLES IN SCHEMA "hub" FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "hub" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "hub" TO "matriz_hub_runtime";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "hub" TO "matriz_hub_runtime";

ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_hub_migration" IN SCHEMA "hub" REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_hub_migration" IN SCHEMA "hub" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "matriz_hub_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_hub_migration" IN SCHEMA "hub" REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_hub_migration" IN SCHEMA "hub" GRANT USAGE, SELECT ON SEQUENCES TO "matriz_hub_runtime";

DO $$
DECLARE
  tenant_table record;
  policy_name text;
BEGIN
  FOR tenant_table IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'hub' AND column_name = 'tenantId'
    ORDER BY table_name
  LOOP
    policy_name := tenant_table.table_name || '_tenant_isolation';
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'hub', tenant_table.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'hub', tenant_table.table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_name, 'hub', tenant_table.table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I TO %I USING ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), '''')) WITH CHECK ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), ''''))',
      policy_name,
      'hub',
      tenant_table.table_name,
      'matriz_hub_runtime'
    );
  END LOOP;
END $$;

-- Release: local-infrastructure-v1. Applied state is authoritative in
-- this schema's _prisma_migrations ledger; no runtime writes a marker.
