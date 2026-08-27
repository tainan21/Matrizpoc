SET search_path TO "pay";
ALTER TABLE "ledger_transactions" ADD COLUMN "requestHash" TEXT NOT NULL;
CREATE TABLE "outbox_events" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT,
  "eventName" TEXT NOT NULL,
  "eventVersion" TEXT NOT NULL DEFAULT 'v1',
  "payloadJson" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "outbox_events_publishedAt_occurredAt_idx" ON "outbox_events"("publishedAt", "occurredAt");
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
