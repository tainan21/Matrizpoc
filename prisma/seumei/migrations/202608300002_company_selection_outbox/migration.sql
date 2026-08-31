CREATE TABLE "company_selections" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "company_selections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "company_selections_tenantId_userId_key" ON "company_selections"("tenantId", "userId");
CREATE INDEX "company_selections_tenantId_companyId_idx" ON "company_selections"("tenantId", "companyId");

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

ALTER TABLE "company_selections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_selections" FORCE ROW LEVEL SECURITY;
CREATE POLICY "company_selections_runtime_tenant" ON "company_selections"
  FOR ALL TO "matriz_seumei_runtime"
  USING ("tenantId" = current_setting('matriz.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('matriz.tenant_id', true));

ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outbox_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outbox_runtime_tenant" ON "outbox_events"
  FOR INSERT TO "matriz_seumei_runtime"
  WITH CHECK ("tenantId" = current_setting('matriz.tenant_id', true));
CREATE POLICY "outbox_worker_operational" ON "outbox_events"
  FOR ALL TO "matriz_seumei_worker"
  USING (true) WITH CHECK (true);
