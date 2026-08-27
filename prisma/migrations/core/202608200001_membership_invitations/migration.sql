-- Additive Core membership invitation lifecycle.
-- Existing tenants, users, app registrations and memberships are unchanged.

CREATE TYPE "MembershipInvitationStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REVOKED'
);

CREATE TABLE "membership_invitations" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "MembershipInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "invitedByUserId" TEXT NOT NULL,
  "acceptedByUserId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "membership_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "membership_invitations_tokenHash_key"
  ON "membership_invitations"("tokenHash");
CREATE UNIQUE INDEX "membership_invitations_tenantId_appId_email_key"
  ON "membership_invitations"("tenantId", "appId", "email");
CREATE INDEX "membership_invitations_tenantId_appId_status_idx"
  ON "membership_invitations"("tenantId", "appId", "status");
CREATE INDEX "membership_invitations_invitedByUserId_idx"
  ON "membership_invitations"("invitedByUserId");
CREATE INDEX "membership_invitations_acceptedByUserId_idx"
  ON "membership_invitations"("acceptedByUserId");

ALTER TABLE "membership_invitations"
  ADD CONSTRAINT "membership_invitations_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_invitations"
  ADD CONSTRAINT "membership_invitations_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "membership_invitations"
  ADD CONSTRAINT "membership_invitations_acceptedByUserId_fkey"
  FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
