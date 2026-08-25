SET search_path TO "core";
GRANT USAGE ON SCHEMA "core" TO "matriz_core_runtime";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "core" FROM PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "core" TO "matriz_core_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_core_migration" IN SCHEMA "core"
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_core_migration" IN SCHEMA "core"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "matriz_core_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_core_migration" IN SCHEMA "core"
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_core_migration" IN SCHEMA "core"
  GRANT USAGE, SELECT ON SEQUENCES TO "matriz_core_runtime";

REVOKE ALL ON ALL TABLES IN SCHEMA "core" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "core" TO "matriz_core_runtime";

DO $$
DECLARE tenant_table text;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'tenant_memberships', 'app_grants', 'identity_audit_events', 'app_registrations',
    'external_links', 'onboarding_progress', 'app_sessions', 'telemetry_records'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tenant_table || '_tenant_isolation', tenant_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I TO "matriz_core_runtime" USING ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), '''')) WITH CHECK ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), ''''))',
      tenant_table || '_tenant_isolation', tenant_table
    );
  END LOOP;
END $$;

-- Tenant is the tenant-scoped root: its primary key is the scope itself.
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_tenant_isolation" ON "tenants";
CREATE POLICY "tenants_tenant_isolation" ON "tenants" TO "matriz_core_runtime"
  USING ("id" = NULLIF(current_setting('matriz.tenant_id', true), ''))
  WITH CHECK ("id" = NULLIF(current_setting('matriz.tenant_id', true), ''));
