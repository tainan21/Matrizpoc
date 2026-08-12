SET search_path TO "willdash";
GRANT USAGE ON SCHEMA "willdash" TO "matriz_willdash_runtime";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "willdash" FROM PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "willdash" TO "matriz_willdash_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_willdash_migration" IN SCHEMA "willdash"
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_willdash_migration" IN SCHEMA "willdash"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "matriz_willdash_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_willdash_migration" IN SCHEMA "willdash"
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_willdash_migration" IN SCHEMA "willdash"
  GRANT USAGE, SELECT ON SEQUENCES TO "matriz_willdash_runtime";
REVOKE ALL ON ALL TABLES IN SCHEMA "willdash" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "willdash" TO "matriz_willdash_runtime";
DO $$ DECLARE tenant_table text; BEGIN
  FOREACH tenant_table IN ARRAY ARRAY['goals', 'reward_rules', 'activity_records', 'willdash_preferences'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tenant_table || '_tenant_isolation', tenant_table);
    EXECUTE format('CREATE POLICY %I ON %I TO "matriz_willdash_runtime" USING ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), '''')) WITH CHECK ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), ''''))', tenant_table || '_tenant_isolation', tenant_table);
  END LOOP;
END $$;
