SET search_path TO "spot";
GRANT USAGE ON SCHEMA "spot" TO "matriz_spot_runtime";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "spot" FROM PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "spot" TO "matriz_spot_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_spot_migration" IN SCHEMA "spot"
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_spot_migration" IN SCHEMA "spot"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "matriz_spot_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_spot_migration" IN SCHEMA "spot"
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_spot_migration" IN SCHEMA "spot"
  GRANT USAGE, SELECT ON SEQUENCES TO "matriz_spot_runtime";
REVOKE ALL ON ALL TABLES IN SCHEMA "spot" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "spot" TO "matriz_spot_runtime";
DO $$ DECLARE tenant_table text; BEGIN
  FOREACH tenant_table IN ARRAY ARRAY['bands', 'artist_profiles', 'gigs', 'gig_bookings', 'spot_preferences'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tenant_table || '_tenant_isolation', tenant_table);
    EXECUTE format('CREATE POLICY %I ON %I TO "matriz_spot_runtime" USING ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), '''')) WITH CHECK ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), ''''))', tenant_table || '_tenant_isolation', tenant_table);
  END LOOP;
END $$;
