\set ON_ERROR_STOP on

DO $$
DECLARE actual integer;
BEGIN
  SELECT count(*) INTO actual
  FROM information_schema.columns tenant_column
  JOIN pg_namespace namespace ON namespace.nspname = tenant_column.table_schema
  JOIN pg_class table_object ON table_object.relnamespace = namespace.oid AND table_object.relname = tenant_column.table_name
  WHERE tenant_column.table_schema IN ('core', 'hub', 'spot', 'seumei', 'contracts', 'willdash')
    AND tenant_column.column_name = 'tenantId'
    AND NOT (table_object.relrowsecurity AND table_object.relforcerowsecurity);
  IF actual <> 0 THEN RAISE EXCEPTION 'Found % tenantId tables without forced RLS', actual; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class table_object JOIN pg_namespace namespace ON namespace.oid = table_object.relnamespace
    WHERE namespace.nspname = 'core' AND table_object.relname = 'tenants'
      AND table_object.relrowsecurity AND table_object.relforcerowsecurity
  ) THEN RAISE EXCEPTION 'core.tenants root is missing forced RLS'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = ANY (ARRAY[
      'matriz_core_runtime', 'matriz_hub_runtime', 'matriz_spot_runtime',
      'matriz_seumei_runtime', 'matriz_contracts_runtime', 'matriz_willdash_runtime',
      'matriz_ops_runtime', 'matriz_pay_runtime'
    ]) AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolreplication OR rolbypassrls)
  ) THEN RAISE EXCEPTION 'Runtime role has unsafe attributes'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_auth_members membership JOIN pg_roles member ON member.oid = membership.member
    WHERE member.rolname LIKE 'matriz\_%\_runtime' ESCAPE '\'
  ) THEN RAISE EXCEPTION 'Runtime role must not inherit membership'; END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(ARRAY['core','hub','spot','seumei','contracts','willdash','ops','pay']) own_schema
    CROSS JOIN unnest(ARRAY['core','hub','spot','seumei','contracts','willdash','ops','pay']) candidate_schema
    WHERE (candidate_schema = own_schema) <> has_schema_privilege('matriz_' || own_schema || '_runtime', candidate_schema, 'USAGE')
  ) THEN RAISE EXCEPTION 'Runtime schema ACL is not exact'; END IF;
END $$;

INSERT INTO core.tenants (id, slug, name, "updatedAt") VALUES
  ('tenant-a', 'rls-a', 'A', CURRENT_TIMESTAMP), ('tenant-b', 'rls-b', 'B', CURRENT_TIMESTAMP);
INSERT INTO core.users (id, email, "displayName", "updatedAt") VALUES
  ('rls-user-a', 'rls-a@example.invalid', 'A', CURRENT_TIMESTAMP), ('rls-user-b', 'rls-b@example.invalid', 'B', CURRENT_TIMESTAMP),
  ('rls-user-new', 'rls-new@example.invalid', 'New', CURRENT_TIMESTAMP);
INSERT INTO core.tenant_memberships (id, "tenantId", "userId", "tenantRoles", "updatedAt") VALUES
  ('membership-a', 'tenant-a', 'rls-user-a', ARRAY['owner'], CURRENT_TIMESTAMP),
  ('membership-b', 'tenant-b', 'rls-user-b', ARRAY['owner'], CURRENT_TIMESTAMP);
INSERT INTO hub.knowledge_nodes (id, "tenantId", type, name, slug, "updatedAt") VALUES
  ('hub-a', 'tenant-a', 'test', 'A', 'rls-a', CURRENT_TIMESTAMP), ('hub-b', 'tenant-b', 'test', 'B', 'rls-b', CURRENT_TIMESTAMP);
INSERT INTO spot.spot_preferences (id, "tenantId", "updatedAt") VALUES
  ('spot-a', 'tenant-a', CURRENT_TIMESTAMP), ('spot-b', 'tenant-b', CURRENT_TIMESTAMP);
INSERT INTO seumei.seumei_preferences (id, "tenantId", "updatedAt") VALUES
  ('seumei-a', 'tenant-a', CURRENT_TIMESTAMP), ('seumei-b', 'tenant-b', CURRENT_TIMESTAMP);
INSERT INTO contracts.contract_templates (id, "tenantId", slug, title, "bodyMarkdown", "updatedAt") VALUES
  ('contracts-a', 'tenant-a', 'rls-a', 'A', 'A', CURRENT_TIMESTAMP), ('contracts-b', 'tenant-b', 'rls-b', 'B', 'B', CURRENT_TIMESTAMP);
INSERT INTO willdash.willdash_preferences (id, "tenantId", "updatedAt") VALUES
  ('willdash-a', 'tenant-a', CURRENT_TIMESTAMP), ('willdash-b', 'tenant-b', CURRENT_TIMESTAMP);

CREATE OR REPLACE FUNCTION pg_temp.verify_runtime_role(
  expected_role text, select_sql text, insert_sql text, tenant_change_sql text,
  update_sql text, delete_sql text, cross_app_sql text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE count_value integer;
BEGIN
  IF current_user <> expected_role THEN RAISE EXCEPTION 'Expected role %, got %', expected_role, current_user; END IF;
  EXECUTE select_sql INTO count_value;
  IF count_value <> 1 THEN RAISE EXCEPTION '% tenant A saw % rows', expected_role, count_value; END IF;
  EXECUTE insert_sql;
  BEGIN
    EXECUTE tenant_change_sql;
    RAISE EXCEPTION '% tenant-change unexpectedly succeeded', expected_role;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  EXECUTE update_sql;
  EXECUTE delete_sql;
  BEGIN
    EXECUTE cross_app_sql;
    RAISE EXCEPTION '% cross-app read unexpectedly succeeded', expected_role;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- Each role is exercised independently. `set_config(..., true)` is transaction
-- local, matching pooled runtime semantics used by withTenantContext.
BEGIN; SET ROLE matriz_core_runtime; SELECT set_config('matriz.tenant_id', 'tenant-a', true);
SELECT pg_temp.verify_runtime_role('matriz_core_runtime', 'SELECT count(*) FROM core.tenants',
  'INSERT INTO core.tenant_memberships (id,"tenantId","userId","tenantRoles","updatedAt") VALUES (''core-new'',''tenant-a'',''rls-user-new'',ARRAY[''member''],CURRENT_TIMESTAMP)',
  'UPDATE core.tenant_memberships SET "tenantId"=''tenant-b'' WHERE id=''core-new''',
  'UPDATE core.tenant_memberships SET "tenantRoles"=ARRAY[''changed''] WHERE id=''core-new''', 'DELETE FROM core.tenant_memberships WHERE id=''core-new''',
  'SELECT count(*) FROM spot.spot_preferences'); COMMIT;
SET ROLE matriz_core_runtime; DO $$ BEGIN IF (SELECT count(*) FROM core.tenants) <> 0 THEN RAISE EXCEPTION 'core context leaked'; END IF; END $$; RESET ROLE;

BEGIN; SET ROLE matriz_hub_runtime; SELECT set_config('matriz.tenant_id', 'tenant-a', true);
SELECT pg_temp.verify_runtime_role('matriz_hub_runtime', 'SELECT count(*) FROM hub.knowledge_nodes',
  'INSERT INTO hub.knowledge_nodes (id,"tenantId",type,name,slug,"updatedAt") VALUES (''hub-new'',''tenant-a'',''test'',''new'',''new'',CURRENT_TIMESTAMP)',
  'UPDATE hub.knowledge_nodes SET "tenantId"=''tenant-b'' WHERE id=''hub-new''',
  'UPDATE hub.knowledge_nodes SET name=''changed'' WHERE id=''hub-new''', 'DELETE FROM hub.knowledge_nodes WHERE id=''hub-new''',
  'SELECT count(*) FROM spot.spot_preferences'); COMMIT;
SET ROLE matriz_hub_runtime; DO $$ BEGIN IF (SELECT count(*) FROM hub.knowledge_nodes) <> 0 THEN RAISE EXCEPTION 'hub context leaked'; END IF; END $$; RESET ROLE;

BEGIN; SET ROLE matriz_spot_runtime; SELECT set_config('matriz.tenant_id', 'tenant-a', true);
SELECT pg_temp.verify_runtime_role('matriz_spot_runtime', 'SELECT count(*) FROM spot.spot_preferences',
  'INSERT INTO spot.spot_preferences (id,"tenantId","updatedAt") VALUES (''spot-new'',''tenant-a'',CURRENT_TIMESTAMP) ON CONFLICT ("tenantId") DO UPDATE SET id=EXCLUDED.id',
  'UPDATE spot.spot_preferences SET "tenantId"=''tenant-b'' WHERE id=''spot-new''',
  'UPDATE spot.spot_preferences SET "preferredCurrency"=''USD'' WHERE id=''spot-new''', 'DELETE FROM spot.spot_preferences WHERE id=''spot-new''',
  'SELECT count(*) FROM hub.knowledge_nodes'); COMMIT;
SET ROLE matriz_spot_runtime; DO $$ BEGIN IF (SELECT count(*) FROM spot.spot_preferences) <> 0 THEN RAISE EXCEPTION 'spot context leaked'; END IF; END $$; RESET ROLE;

BEGIN; SET ROLE matriz_seumei_runtime; SELECT set_config('matriz.tenant_id', 'tenant-a', true);
SELECT pg_temp.verify_runtime_role('matriz_seumei_runtime', 'SELECT count(*) FROM seumei.seumei_preferences',
  'INSERT INTO seumei.seumei_preferences (id,"tenantId","updatedAt") VALUES (''seumei-new'',''tenant-a'',CURRENT_TIMESTAMP) ON CONFLICT ("tenantId") DO UPDATE SET id=EXCLUDED.id',
  'UPDATE seumei.seumei_preferences SET "tenantId"=''tenant-b'' WHERE id=''seumei-new''',
  'UPDATE seumei.seumei_preferences SET "preferredCurrency"=''USD'' WHERE id=''seumei-new''', 'DELETE FROM seumei.seumei_preferences WHERE id=''seumei-new''',
  'SELECT count(*) FROM contracts.contract_templates'); COMMIT;
SET ROLE matriz_seumei_runtime; DO $$ BEGIN IF (SELECT count(*) FROM seumei.seumei_preferences) <> 0 THEN RAISE EXCEPTION 'seumei context leaked'; END IF; END $$; RESET ROLE;

BEGIN; SET ROLE matriz_contracts_runtime; SELECT set_config('matriz.tenant_id', 'tenant-a', true);
SELECT pg_temp.verify_runtime_role('matriz_contracts_runtime', 'SELECT count(*) FROM contracts.contract_templates',
  'INSERT INTO contracts.contract_templates (id,"tenantId",slug,title,"bodyMarkdown","updatedAt") VALUES (''contracts-new'',''tenant-a'',''new'',''new'',''new'',CURRENT_TIMESTAMP)',
  'UPDATE contracts.contract_templates SET "tenantId"=''tenant-b'' WHERE id=''contracts-new''',
  'UPDATE contracts.contract_templates SET title=''changed'' WHERE id=''contracts-new''', 'DELETE FROM contracts.contract_templates WHERE id=''contracts-new''',
  'SELECT count(*) FROM willdash.willdash_preferences'); COMMIT;
SET ROLE matriz_contracts_runtime; DO $$ BEGIN IF (SELECT count(*) FROM contracts.contract_templates) <> 0 THEN RAISE EXCEPTION 'contracts context leaked'; END IF; END $$; RESET ROLE;

BEGIN; SET ROLE matriz_willdash_runtime; SELECT set_config('matriz.tenant_id', 'tenant-a', true);
SELECT pg_temp.verify_runtime_role('matriz_willdash_runtime', 'SELECT count(*) FROM willdash.willdash_preferences',
  'INSERT INTO willdash.willdash_preferences (id,"tenantId","updatedAt") VALUES (''willdash-new'',''tenant-a'',CURRENT_TIMESTAMP) ON CONFLICT ("tenantId") DO UPDATE SET id=EXCLUDED.id',
  'UPDATE willdash.willdash_preferences SET "tenantId"=''tenant-b'' WHERE id=''willdash-new''',
  'UPDATE willdash.willdash_preferences SET "preferredCadence"=''DAILY'' WHERE id=''willdash-new''', 'DELETE FROM willdash.willdash_preferences WHERE id=''willdash-new''',
  'SELECT count(*) FROM core.tenants'); COMMIT;
SET ROLE matriz_willdash_runtime; DO $$ BEGIN IF (SELECT count(*) FROM willdash.willdash_preferences) <> 0 THEN RAISE EXCEPTION 'willdash context leaked'; END IF; END $$; RESET ROLE;
