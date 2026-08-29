SET search_path TO "core";

CREATE TABLE "oidc_app_sessions" (
  "handleHash" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "oidc_app_sessions_pkey" PRIMARY KEY ("handleHash")
);
CREATE INDEX "oidc_app_sessions_clientId_appId_expiresAt_idx" ON "oidc_app_sessions"("clientId", "appId", "expiresAt");
CREATE INDEX "oidc_app_sessions_expiresAt_idx" ON "oidc_app_sessions"("expiresAt");
REVOKE ALL ON TABLE "oidc_app_sessions" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "oidc_app_sessions" TO "matriz_core_runtime";
