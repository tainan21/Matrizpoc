SET search_path TO "seumei";

ALTER TABLE "establishment_profiles" DROP CONSTRAINT "establishment_profiles_establishmentId_fkey";
ALTER TABLE "order_drafts" DROP CONSTRAINT "order_drafts_establishmentId_fkey";
DROP INDEX "establishment_profiles_establishmentId_key";
DROP INDEX "order_drafts_establishmentId_idx";

CREATE UNIQUE INDEX "establishments_tenantId_id_key" ON "establishments"("tenantId", "id");
CREATE UNIQUE INDEX "establishment_profiles_tenantId_establishmentId_key" ON "establishment_profiles"("tenantId", "establishmentId");
CREATE INDEX "order_drafts_tenantId_establishmentId_idx" ON "order_drafts"("tenantId", "establishmentId");

ALTER TABLE "establishment_profiles" ADD CONSTRAINT "establishment_profiles_tenantId_establishmentId_fkey" FOREIGN KEY ("tenantId", "establishmentId") REFERENCES "establishments"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_drafts" ADD CONSTRAINT "order_drafts_tenantId_establishmentId_fkey" FOREIGN KEY ("tenantId", "establishmentId") REFERENCES "establishments"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
