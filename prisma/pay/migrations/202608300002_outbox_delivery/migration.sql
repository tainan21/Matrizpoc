SET search_path TO "pay";

ALTER TABLE "outbox_events"
  ADD COLUMN "deduplicationKey" TEXT,
  ADD COLUMN "lockedUntil" TIMESTAMP(3),
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "lastErrorCode" TEXT,
  ADD COLUMN "deadLetteredAt" TIMESTAMP(3);

CREATE INDEX "outbox_delivery_claim_idx"
ON "outbox_events"("deadLetteredAt", "nextAttemptAt", "lockedUntil", "occurredAt");

CREATE UNIQUE INDEX "outbox_events_deduplicationKey_key"
ON "outbox_events"("deduplicationKey");
