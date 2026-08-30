SET search_path TO "ops";

GRANT USAGE ON SCHEMA "ops" TO "matriz_ops_runtime";
REVOKE ALL ON ALL TABLES IN SCHEMA "ops" FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "ops" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "ops" TO "matriz_ops_runtime";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "ops" TO "matriz_ops_runtime";

ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_ops_migration" IN SCHEMA "ops" REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_ops_migration" IN SCHEMA "ops" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "matriz_ops_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_ops_migration" IN SCHEMA "ops" REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_ops_migration" IN SCHEMA "ops" GRANT USAGE, SELECT ON SEQUENCES TO "matriz_ops_runtime";

-- Ops is operator-global; tenant affected is audit data, not row authority.
-- Release: local-infrastructure-v1. Applied state is authoritative in
-- this schema's _prisma_migrations ledger; no runtime writes a marker.
