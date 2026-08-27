CREATE TABLE "telemetry_daily_aggregates" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "eventCount" INTEGER NOT NULL,
  "errorCount" INTEGER NOT NULL,
  "activeUserCount" INTEGER NOT NULL,
  "sessionCount" INTEGER NOT NULL,
  "p95DurationMs" INTEGER,
  "lastSignalAt" TIMESTAMP(3),
  "appVersion" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "telemetry_daily_aggregates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "telemetry_daily_aggregates_tenantId_appId_day_key" ON "telemetry_daily_aggregates"("tenantId","appId","day");
CREATE INDEX "telemetry_daily_aggregates_day_appId_idx" ON "telemetry_daily_aggregates"("day","appId");
ALTER TABLE "telemetry_daily_aggregates" ADD CONSTRAINT "telemetry_daily_aggregates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telemetry_daily_aggregates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "telemetry_daily_aggregates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "telemetry_daily_aggregates_tenant_isolation" ON "telemetry_daily_aggregates" TO "matriz_core_runtime" USING ("tenantId" = NULLIF(current_setting('matriz.tenant_id', true), '')) WITH CHECK ("tenantId" = NULLIF(current_setting('matriz.tenant_id', true), ''));
