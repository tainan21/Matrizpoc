SET search_path TO "pay";
ALTER TABLE "provider_events" ADD COLUMN "processedTransactionId" TEXT;
CREATE UNIQUE INDEX "provider_events_processedTransactionId_key" ON "provider_events"("processedTransactionId");
