SET search_path TO "contracts";

ALTER TABLE "contracts" DROP CONSTRAINT "contracts_templateId_fkey";
ALTER TABLE "contract_parties" DROP CONSTRAINT "contract_parties_contractId_fkey";
ALTER TABLE "contract_versions" DROP CONSTRAINT "contract_versions_contractId_fkey";
ALTER TABLE "contract_events" DROP CONSTRAINT "contract_events_contractId_fkey";
DROP INDEX "contract_versions_contractId_versionNo_key";
DROP INDEX "contract_parties_contractId_idx";
DROP INDEX "contract_versions_tenantId_idx";
DROP INDEX "contract_events_contractId_occurredAt_idx";

CREATE UNIQUE INDEX "contracts_tenantId_id_key" ON "contracts"("tenantId", "id");
CREATE UNIQUE INDEX "contract_templates_tenantId_id_key" ON "contract_templates"("tenantId", "id");
CREATE UNIQUE INDEX "contract_versions_tenantId_contractId_versionNo_key" ON "contract_versions"("tenantId", "contractId", "versionNo");
CREATE INDEX "contract_parties_tenantId_contractId_idx" ON "contract_parties"("tenantId", "contractId");
CREATE INDEX "contract_versions_tenantId_contractId_idx" ON "contract_versions"("tenantId", "contractId");
CREATE INDEX "contract_events_tenantId_contractId_occurredAt_idx" ON "contract_events"("tenantId", "contractId", "occurredAt");
CREATE INDEX "contracts_tenantId_templateId_idx" ON "contracts"("tenantId", "templateId");

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenantId_templateId_fkey" FOREIGN KEY ("tenantId", "templateId") REFERENCES "contract_templates"("tenantId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "contract_parties" ADD CONSTRAINT "contract_parties_tenantId_contractId_fkey" FOREIGN KEY ("tenantId", "contractId") REFERENCES "contracts"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_tenantId_contractId_fkey" FOREIGN KEY ("tenantId", "contractId") REFERENCES "contracts"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_events" ADD CONSTRAINT "contract_events_tenantId_contractId_fkey" FOREIGN KEY ("tenantId", "contractId") REFERENCES "contracts"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
