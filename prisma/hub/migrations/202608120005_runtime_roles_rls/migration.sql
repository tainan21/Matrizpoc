SET search_path TO "hub";
GRANT USAGE ON SCHEMA "hub" TO "matriz_hub_runtime";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "hub" FROM PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "hub" TO "matriz_hub_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_hub_migration" IN SCHEMA "hub"
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_hub_migration" IN SCHEMA "hub"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "matriz_hub_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_hub_migration" IN SCHEMA "hub"
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_hub_migration" IN SCHEMA "hub"
  GRANT USAGE, SELECT ON SEQUENCES TO "matriz_hub_runtime";

REVOKE ALL ON ALL TABLES IN SCHEMA "hub" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "hub" TO "matriz_hub_runtime";

DO $$
DECLARE tenant_table text;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'doc_documents', 'doc_document_versions', 'doc_blocks', 'doc_chunks', 'doc_source_artifacts',
    'doc_conversion_runs', 'knowledge_nodes', 'knowledge_edges', 'doc_entity_mentions', 'doc_suggestions',
    'doc_context_packages', 'doc_context_package_items', 'doc_timeline_events', 'doc_mcp_resource_snapshots',
    'doc_export_artifacts', 'doc_task_candidates', 'doc_governance_candidates', 'doc_actor_runs', 'doc_access_policies'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tenant_table || '_tenant_isolation', tenant_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I TO "matriz_hub_runtime" USING ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), '''')) WITH CHECK ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), ''''))',
      tenant_table || '_tenant_isolation', tenant_table
    );
  END LOOP;
END $$;
