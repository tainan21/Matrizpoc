SET search_path TO "core";

ALTER TABLE "oidc_clients" ADD COLUMN "appId" TEXT;
UPDATE "oidc_clients" SET "appId" = "clientId" WHERE "appId" IS NULL;
ALTER TABLE "oidc_clients" ALTER COLUMN "appId" SET NOT NULL;
CREATE INDEX "oidc_clients_appId_enabled_revokedAt_idx" ON "oidc_clients"("appId", "enabled", "revokedAt");

CREATE TABLE "identity_mfa_methods" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "kind" TEXT NOT NULL, "label" TEXT,
  "secretCiphertext" TEXT, "credentialId" TEXT, "publicKey" TEXT, "signCount" INTEGER, "lastTotpCounter" BIGINT,
  "transports" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "verifiedAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "identity_mfa_methods_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "identity_mfa_methods_credentialId_key" ON "identity_mfa_methods"("credentialId");
CREATE INDEX "identity_mfa_methods_userId_kind_revokedAt_idx" ON "identity_mfa_methods"("userId", "kind", "revokedAt");
ALTER TABLE "identity_mfa_methods" ADD CONSTRAINT "identity_mfa_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "identity_recovery_codes" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "codeHash" TEXT NOT NULL, "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "identity_recovery_codes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "identity_recovery_codes_userId_consumedAt_idx" ON "identity_recovery_codes"("userId", "consumedAt");
ALTER TABLE "identity_recovery_codes" ADD CONSTRAINT "identity_recovery_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
