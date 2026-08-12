SET search_path TO "seumei";
GRANT USAGE ON SCHEMA "seumei" TO "matriz_seumei_runtime";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "seumei" FROM PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "seumei" TO "matriz_seumei_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_seumei_migration" IN SCHEMA "seumei"
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_seumei_migration" IN SCHEMA "seumei"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "matriz_seumei_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_seumei_migration" IN SCHEMA "seumei"
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_seumei_migration" IN SCHEMA "seumei"
  GRANT USAGE, SELECT ON SEQUENCES TO "matriz_seumei_runtime";
REVOKE ALL ON ALL TABLES IN SCHEMA "seumei" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "seumei" TO "matriz_seumei_runtime";
DO $$ DECLARE tenant_table text; BEGIN
  FOREACH tenant_table IN ARRAY ARRAY['establishments', 'establishment_profiles', 'order_drafts', 'seumei_preferences'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tenant_table || '_tenant_isolation', tenant_table);
    EXECUTE format('CREATE POLICY %I ON %I TO "matriz_seumei_runtime" USING ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), '''')) WITH CHECK ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), ''''))', tenant_table || '_tenant_isolation', tenant_table);
  END LOOP;
END $$;
