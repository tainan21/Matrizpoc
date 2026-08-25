SET search_path TO "contracts";
GRANT USAGE ON SCHEMA "contracts" TO "matriz_contracts_runtime";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "contracts" FROM PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "contracts" TO "matriz_contracts_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_contracts_migration" IN SCHEMA "contracts"
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_contracts_migration" IN SCHEMA "contracts"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "matriz_contracts_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_contracts_migration" IN SCHEMA "contracts"
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_contracts_migration" IN SCHEMA "contracts"
  GRANT USAGE, SELECT ON SEQUENCES TO "matriz_contracts_runtime";
REVOKE ALL ON ALL TABLES IN SCHEMA "contracts" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "contracts" TO "matriz_contracts_runtime";
DO $$ DECLARE tenant_table text; BEGIN
  FOREACH tenant_table IN ARRAY ARRAY['contracts', 'contract_parties', 'contract_versions', 'contract_events', 'contract_templates'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tenant_table || '_tenant_isolation', tenant_table);
    EXECUTE format('CREATE POLICY %I ON %I TO "matriz_contracts_runtime" USING ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), '''')) WITH CHECK ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), ''''))', tenant_table || '_tenant_isolation', tenant_table);
  END LOOP;
END $$;
