CREATE TABLE "outbox_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "eventVersion" TEXT NOT NULL DEFAULT 'v1',
  "deduplicationKey" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "lockedUntil" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "deadLetteredAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "outbox_events_deduplicationKey_key" ON "outbox_events"("deduplicationKey");
CREATE INDEX "outbox_events_delivery_idx" ON "outbox_events"("deadLetteredAt", "nextAttemptAt", "lockedUntil", "occurredAt");
CREATE INDEX "outbox_events_tenant_delivery_idx" ON "outbox_events"("tenantId", "publishedAt", "occurredAt");
ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbox_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outbox_runtime_tenant" ON "outbox_events" FOR INSERT TO "matriz_hub_runtime"
  WITH CHECK ("tenantId" = current_setting('matriz.tenant_id', true));
CREATE POLICY "outbox_worker_operational" ON "outbox_events" FOR ALL TO "matriz_hub_worker"
  USING (true) WITH CHECK (true);
