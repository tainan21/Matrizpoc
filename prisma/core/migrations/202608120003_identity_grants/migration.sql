SET search_path TO "core";

-- The approved baseline starts empty. Replace the app-coupled authority
-- instead of preserving it through a lossy or ambiguous data backfill.
DROP TABLE "memberships";
DROP TYPE "MembershipRole";

CREATE TABLE "tenant_memberships" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "tenantRoles" TEXT[] NOT NULL, "invitedAt" TIMESTAMP(3), "invitedByUserId" TEXT,
  "acceptedAt" TIMESTAMP(3), "lastActiveAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT, "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "app_grants" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "membershipId" TEXT NOT NULL, "appId" TEXT NOT NULL,
  "appRoles" TEXT[] NOT NULL, "capabilities" TEXT[] NOT NULL, "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "grantedByUserId" TEXT, "revokedAt" TIMESTAMP(3), "revokedByUserId" TEXT, "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "app_grants_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "oidc_clients" (
  "id" TEXT NOT NULL, "clientId" TEXT NOT NULL, "name" TEXT NOT NULL,
  "redirectUris" TEXT[] NOT NULL, "postLogoutRedirectUris" TEXT[] NOT NULL, "grantTypes" TEXT[] NOT NULL, "responseTypes" TEXT[] NOT NULL,
  "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'none', "enabled" BOOLEAN NOT NULL DEFAULT true,
  "revokedAt" TIMESTAMP(3), "revokedByUserId" TEXT, "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "oidc_clients_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "identity_audit_events" (
  "id" TEXT NOT NULL, "tenantId" TEXT, "actorUserId" TEXT, "eventType" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL, "subjectId" TEXT NOT NULL, "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "identity_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_memberships_tenantId_userId_key" ON "tenant_memberships"("tenantId", "userId");
CREATE INDEX "tenant_memberships_tenantId_revokedAt_idx" ON "tenant_memberships"("tenantId", "revokedAt");
CREATE INDEX "tenant_memberships_userId_revokedAt_idx" ON "tenant_memberships"("userId", "revokedAt");
CREATE UNIQUE INDEX "app_grants_membershipId_appId_key" ON "app_grants"("membershipId", "appId");
CREATE INDEX "app_grants_tenantId_appId_revokedAt_idx" ON "app_grants"("tenantId", "appId", "revokedAt");
CREATE INDEX "app_grants_membershipId_revokedAt_idx" ON "app_grants"("membershipId", "revokedAt");
CREATE UNIQUE INDEX "oidc_clients_clientId_key" ON "oidc_clients"("clientId");
CREATE INDEX "oidc_clients_enabled_revokedAt_idx" ON "oidc_clients"("enabled", "revokedAt");
CREATE INDEX "identity_audit_events_tenantId_occurredAt_idx" ON "identity_audit_events"("tenantId", "occurredAt");
CREATE INDEX "identity_audit_events_subjectType_subjectId_occurredAt_idx" ON "identity_audit_events"("subjectType", "subjectId", "occurredAt");
CREATE INDEX "identity_audit_events_actorUserId_occurredAt_idx" ON "identity_audit_events"("actorUserId", "occurredAt");

ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "app_grants" ADD CONSTRAINT "app_grants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "app_grants" ADD CONSTRAINT "app_grants_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "tenant_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "app_grants" ADD CONSTRAINT "app_grants_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "app_grants" ADD CONSTRAINT "app_grants_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "oidc_clients" ADD CONSTRAINT "oidc_clients_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "identity_audit_events" ADD CONSTRAINT "identity_audit_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "identity_audit_events" ADD CONSTRAINT "identity_audit_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
