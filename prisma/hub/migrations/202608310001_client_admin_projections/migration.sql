SET search_path TO "hub";

CREATE TABLE "client_portal_systems" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "publicUrl" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_portal_systems_pkey" PRIMARY KEY ("tenantId", "id")
);

CREATE TABLE "client_portal_data_sources" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "systemId" TEXT,
  "provider" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'not_configured',
  "lastAttemptAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_portal_data_sources_pkey" PRIMARY KEY ("tenantId", "id")
);

CREATE TABLE "client_portal_snapshots" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB NOT NULL,
  CONSTRAINT "client_portal_snapshots_pkey" PRIMARY KEY ("tenantId", "id")
);

CREATE TABLE "client_portal_payment_projections" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "status" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "externalReference" TEXT,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_portal_payment_projections_pkey" PRIMARY KEY ("tenantId", "id")
);

CREATE INDEX "client_portal_systems_tenantId_category_enabled_idx" ON "client_portal_systems"("tenantId", "category", "enabled");
CREATE UNIQUE INDEX "client_portal_systems_tenantId_id_key" ON "client_portal_systems"("tenantId", "id");
CREATE INDEX "client_portal_data_sources_tenantId_provider_state_idx" ON "client_portal_data_sources"("tenantId", "provider", "state");
CREATE INDEX "client_portal_data_sources_tenantId_systemId_idx" ON "client_portal_data_sources"("tenantId", "systemId");
CREATE UNIQUE INDEX "client_portal_data_sources_tenantId_id_key" ON "client_portal_data_sources"("tenantId", "id");
CREATE INDEX "client_portal_snapshots_tenantId_sourceId_capturedAt_idx" ON "client_portal_snapshots"("tenantId", "sourceId", "capturedAt");
CREATE INDEX "client_portal_snapshots_tenantId_kind_capturedAt_idx" ON "client_portal_snapshots"("tenantId", "kind", "capturedAt");
CREATE INDEX "client_portal_payment_projections_tenantId_status_dueAt_idx" ON "client_portal_payment_projections"("tenantId", "status", "dueAt");

ALTER TABLE "client_portal_data_sources" ADD CONSTRAINT "client_portal_data_sources_tenantId_systemId_fkey" FOREIGN KEY ("tenantId", "systemId") REFERENCES "client_portal_systems"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_portal_snapshots" ADD CONSTRAINT "client_portal_snapshots_tenantId_sourceId_fkey" FOREIGN KEY ("tenantId", "sourceId") REFERENCES "client_portal_data_sources"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "client_portal_systems", "client_portal_data_sources", "client_portal_snapshots", "client_portal_payment_projections" TO "matriz_hub_runtime";

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['client_portal_systems','client_portal_data_sources','client_portal_snapshots','client_portal_payment_projections']
  LOOP
    EXECUTE format('ALTER TABLE "hub".%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE "hub".%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY %I ON "hub".%I TO "matriz_hub_runtime" USING ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), '''')) WITH CHECK ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), ''''))', table_name || '_tenant_isolation', table_name);
  END LOOP;
END $$;
