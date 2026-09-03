SET search_path TO "ops";

CREATE TABLE "inbox_events" (
  "sourceEventId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "eventVersion" TEXT NOT NULL,
  "sourceApp" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inbox_events_pkey" PRIMARY KEY ("sourceEventId")
);

CREATE TABLE "pay_event_projections" (
  "sourceEventId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "walletId" TEXT,
  "transactionId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pay_event_projections_pkey" PRIMARY KEY ("sourceEventId")
);

CREATE INDEX "inbox_events_eventName_occurredAt_idx" ON "inbox_events"("eventName", "occurredAt");
CREATE INDEX "pay_event_projections_walletId_occurredAt_idx" ON "pay_event_projections"("walletId", "occurredAt");
CREATE INDEX "pay_event_projections_eventName_occurredAt_idx" ON "pay_event_projections"("eventName", "occurredAt");

REVOKE ALL ON TABLE "inbox_events", "pay_event_projections" FROM PUBLIC;
GRANT SELECT ON TABLE "inbox_events", "pay_event_projections" TO "matriz_ops_runtime";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "inbox_events", "pay_event_projections" TO "matriz_ops_worker";

ALTER DEFAULT PRIVILEGES FOR ROLE "matriz_ops_migration" IN SCHEMA "ops"
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "matriz_ops_worker";
