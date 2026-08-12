SET search_path TO "core";

ALTER TABLE "oidc_clients" ADD COLUMN "secretFingerprint" TEXT;
ALTER TABLE "auth_accounts" ADD COLUMN "credentialHash" TEXT;
CREATE TABLE "identity_rate_limits" (
  "keyHash" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "identity_rate_limits_pkey" PRIMARY KEY ("keyHash")
);
CREATE INDEX "identity_rate_limits_expiresAt_idx" ON "identity_rate_limits"("expiresAt");
REVOKE ALL ON TABLE "identity_rate_limits" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "identity_rate_limits" TO "matriz_core_runtime";

CREATE TABLE "oidc_artifacts" (
  "model" TEXT NOT NULL,
  "id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "grantId" TEXT,
  "userCode" TEXT,
  "uid" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  CONSTRAINT "oidc_artifacts_pkey" PRIMARY KEY ("model", "id")
);

CREATE INDEX "oidc_artifacts_grantId_idx" ON "oidc_artifacts"("grantId");
CREATE INDEX "oidc_artifacts_model_userCode_idx" ON "oidc_artifacts"("model", "userCode");
CREATE INDEX "oidc_artifacts_model_uid_idx" ON "oidc_artifacts"("model", "uid");
CREATE INDEX "oidc_artifacts_expiresAt_idx" ON "oidc_artifacts"("expiresAt");

REVOKE ALL ON TABLE "oidc_artifacts" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "oidc_artifacts" TO "matriz_core_runtime";
