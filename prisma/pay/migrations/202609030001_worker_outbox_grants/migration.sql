SET search_path TO "pay";

GRANT SELECT, UPDATE, DELETE ON TABLE "outbox_events" TO "matriz_pay_worker";
