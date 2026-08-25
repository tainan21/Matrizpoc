-- Additive Seumei company/onboarding foundation.
-- This migration does not rewrite or delete existing Seumei data.

CREATE TYPE "CompanyStatus" AS ENUM (
  'PROVISIONING',
  'ONBOARDING',
  'ACTIVE',
  'PROVISIONING_FAILED'
);

CREATE TYPE "CompanyOperationType" AS ENUM (
  'PHYSICAL_STORE',
  'ONLINE_STORE',
  'SERVICE',
  'HYBRID'
);

CREATE TYPE "CompanyOnboardingStep" AS ENUM (
  'IDENTITY',
  'OPERATION',
  'PREFERENCES',
  'REVIEW',
  'COMPLETED'
);

CREATE TABLE "companies" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" "CompanyStatus" NOT NULL DEFAULT 'PROVISIONING',
  "operationType" "CompanyOperationType",
  "city" TEXT,
  "country" TEXT NOT NULL DEFAULT 'BR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "company_onboarding" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "currentStep" "CompanyOnboardingStep" NOT NULL DEFAULT 'IDENTITY',
  "version" INTEGER NOT NULL DEFAULT 1,
  "draftName" TEXT NOT NULL,
  "draftSlug" TEXT NOT NULL,
  "draftOperationType" "CompanyOperationType",
  "draftCity" TEXT,
  "draftCountry" TEXT NOT NULL DEFAULT 'BR',
  "draftCurrency" TEXT NOT NULL DEFAULT 'BRL',
  "completedSteps" TEXT[],
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "company_onboarding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "companies_tenantId_key" ON "companies"("tenantId");
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");
CREATE UNIQUE INDEX "companies_createdByUserId_idempotencyKey_key"
  ON "companies"("createdByUserId", "idempotencyKey");
CREATE INDEX "companies_createdByUserId_status_idx"
  ON "companies"("createdByUserId", "status");

CREATE UNIQUE INDEX "company_onboarding_companyId_key"
  ON "company_onboarding"("companyId");
CREATE UNIQUE INDEX "company_onboarding_tenantId_key"
  ON "company_onboarding"("tenantId");
CREATE INDEX "company_onboarding_tenantId_currentStep_idx"
  ON "company_onboarding"("tenantId", "currentStep");

ALTER TABLE "company_onboarding"
  ADD CONSTRAINT "company_onboarding_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
