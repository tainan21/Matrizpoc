CREATE SCHEMA IF NOT EXISTS "spot";
SET search_path TO "spot";

-- CreateEnum
CREATE TYPE "GigStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CONFIRMED', 'PERFORMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "bands" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bandId" TEXT NOT NULL,
    "userId" TEXT,
    "stageName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "instrument" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artist_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gigs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bandId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "venueName" TEXT NOT NULL,
    "venueCity" TEXT NOT NULL,
    "venueCountry" TEXT NOT NULL DEFAULT 'BR',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "GigStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gig_bookings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gig_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spot_preferences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "primaryGenre" TEXT,
    "artisticFocus" TEXT,
    "averageGigFeeCents" INTEGER,
    "preferredCurrency" TEXT NOT NULL DEFAULT 'BRL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spot_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bands_tenantId_idx" ON "bands"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "bands_tenantId_slug_key" ON "bands"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "artist_profiles_tenantId_idx" ON "artist_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "artist_profiles_bandId_idx" ON "artist_profiles"("bandId");

-- CreateIndex
CREATE INDEX "gigs_tenantId_idx" ON "gigs"("tenantId");

-- CreateIndex
CREATE INDEX "gigs_bandId_idx" ON "gigs"("bandId");

-- CreateIndex
CREATE INDEX "gigs_tenantId_status_idx" ON "gigs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "gig_bookings_tenantId_idx" ON "gig_bookings"("tenantId");

-- CreateIndex
CREATE INDEX "gig_bookings_gigId_idx" ON "gig_bookings"("gigId");

-- CreateIndex
CREATE UNIQUE INDEX "spot_preferences_tenantId_key" ON "spot_preferences"("tenantId");

-- AddForeignKey
ALTER TABLE "artist_profiles" ADD CONSTRAINT "artist_profiles_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "bands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "bands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gig_bookings" ADD CONSTRAINT "gig_bookings_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "gigs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
