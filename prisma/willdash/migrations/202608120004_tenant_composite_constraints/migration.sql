SET search_path TO "willdash";

ALTER TABLE "reward_rules" DROP CONSTRAINT "reward_rules_goalId_fkey";
ALTER TABLE "activity_records" DROP CONSTRAINT "activity_records_goalId_fkey";
DROP INDEX "reward_rules_goalId_idx";
DROP INDEX "activity_records_occurredAt_idx";

CREATE UNIQUE INDEX "goals_tenantId_id_key" ON "goals"("tenantId", "id");
CREATE INDEX "reward_rules_tenantId_goalId_idx" ON "reward_rules"("tenantId", "goalId");
CREATE INDEX "activity_records_tenantId_occurredAt_idx" ON "activity_records"("tenantId", "occurredAt");
CREATE INDEX "activity_records_tenantId_goalId_idx" ON "activity_records"("tenantId", "goalId");

ALTER TABLE "reward_rules" ADD CONSTRAINT "reward_rules_tenantId_goalId_fkey" FOREIGN KEY ("tenantId", "goalId") REFERENCES "goals"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_records" ADD CONSTRAINT "activity_records_tenantId_goalId_fkey" FOREIGN KEY ("tenantId", "goalId") REFERENCES "goals"("tenantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
