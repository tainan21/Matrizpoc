SET search_path TO "pay";

GRANT USAGE ON SCHEMA "pay" TO "matriz_pay_runtime";
REVOKE ALL ON ALL TABLES IN SCHEMA "pay" FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "pay" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "pay" TO "matriz_pay_runtime";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "pay" TO "matriz_pay_runtime";

ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_pay_migration" IN SCHEMA "pay" REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_pay_migration" IN SCHEMA "pay" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "matriz_pay_runtime";
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_pay_migration" IN SCHEMA "pay" REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_pay_migration" IN SCHEMA "pay" GRANT USAGE, SELECT ON SEQUENCES TO "matriz_pay_runtime";

-- Pay is global-user; tenant RLS would model a false authority.
-- Release: local-infrastructure-v1. Applied state is authoritative in
-- this schema's _prisma_migrations ledger; no runtime writes a marker.
