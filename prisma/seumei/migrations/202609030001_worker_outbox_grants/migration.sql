SET search_path TO "seumei";

GRANT SELECT, UPDATE, DELETE ON TABLE "outbox_events" TO "matriz_seumei_worker";
