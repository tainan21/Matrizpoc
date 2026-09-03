SET search_path TO "hub";

GRANT SELECT, UPDATE, DELETE ON TABLE "outbox_events" TO "matriz_hub_worker";
