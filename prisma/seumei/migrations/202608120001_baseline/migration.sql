CREATE SCHEMA IF NOT EXISTS "seumei";
SET search_path TO "seumei";

-- CreateEnum
CREATE TYPE "EstablishmentType" AS ENUM ('RESTAURANT', 'BAR', 'CAFE', 'VENUE', 'FOODTRUCK', 'OTHER');

-- CreateEnum
CREATE TYPE "EstablishmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OrderDraftStatus" AS ENUM ('DRAFT', 'READY', 'SUBMITTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "establishments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "EstablishmentType" NOT NULL,
    "status" "EstablishmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "addressLine" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "establishment_profiles" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "capacity" INTEGER,
    "openingHours" JSONB,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishment_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_drafts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "OrderDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "items" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seumei_preferences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "defaultType" TEXT,
    "operationsModel" TEXT,
    "preferredCurrency" TEXT NOT NULL DEFAULT 'BRL',
    "enableDeliveryZones" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seumei_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "establishments_tenantId_idx" ON "establishments"("tenantId");

-- CreateIndex
CREATE INDEX "establishments_tenantId_type_idx" ON "establishments"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "establishments_tenantId_slug_key" ON "establishments"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "establishment_profiles_establishmentId_key" ON "establishment_profiles"("establishmentId");

-- CreateIndex
CREATE INDEX "establishment_profiles_tenantId_idx" ON "establishment_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "order_drafts_tenantId_idx" ON "order_drafts"("tenantId");

-- CreateIndex
CREATE INDEX "order_drafts_establishmentId_idx" ON "order_drafts"("establishmentId");

-- CreateIndex
CREATE UNIQUE INDEX "seumei_preferences_tenantId_key" ON "seumei_preferences"("tenantId");

-- AddForeignKey
ALTER TABLE "establishment_profiles" ADD CONSTRAINT "establishment_profiles_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_drafts" ADD CONSTRAINT "order_drafts_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
