SET search_path TO "core";

ALTER TABLE "app_grants" DROP CONSTRAINT "app_grants_membershipId_fkey";
DROP INDEX "app_grants_membershipId_appId_key";
DROP INDEX "app_grants_membershipId_revokedAt_idx";

CREATE UNIQUE INDEX "tenant_memberships_tenantId_id_key" ON "tenant_memberships"("tenantId", "id");
CREATE UNIQUE INDEX "app_grants_tenantId_membershipId_appId_key" ON "app_grants"("tenantId", "membershipId", "appId");
CREATE INDEX "app_grants_tenantId_membershipId_revokedAt_idx" ON "app_grants"("tenantId", "membershipId", "revokedAt");

ALTER TABLE "app_grants" ADD CONSTRAINT "app_grants_tenantId_membershipId_fkey" FOREIGN KEY ("tenantId", "membershipId") REFERENCES "tenant_memberships"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
