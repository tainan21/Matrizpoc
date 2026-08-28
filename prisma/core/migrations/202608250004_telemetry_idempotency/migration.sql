ALTER TABLE "telemetry_records" ADD COLUMN "sourceEventId" TEXT;
CREATE UNIQUE INDEX "telemetry_records_sourceEventId_key" ON "telemetry_records"("sourceEventId");
