SET search_path TO "core";

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ANONYMIZED');
CREATE TYPE "PlatformOperatorRole" AS ENUM ('OWNER', 'OPERATOR', 'AUDITOR');

ALTER TABLE "users"
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" TEXT,
  ADD COLUMN "anonymizedAt" TIMESTAMP(3),
  ADD COLUMN "anonymizedEmailHash" TEXT;

CREATE UNIQUE INDEX "users_anonymizedEmailHash_key" ON "users"("anonymizedEmailHash");

CREATE TABLE "platform_operators" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "PlatformOperatorRole" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  CONSTRAINT "platform_operators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_operators_userId_key" ON "platform_operators"("userId");
CREATE INDEX "platform_operators_role_active_idx" ON "platform_operators"("role", "active");
ALTER TABLE "platform_operators" ADD CONSTRAINT "platform_operators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL ON TABLE "platform_operators" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE "platform_operators" TO "matriz_core_runtime";
