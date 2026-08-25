CREATE SCHEMA IF NOT EXISTS "willdash";
SET search_path TO "willdash";

-- CreateEnum
CREATE TYPE "GoalMetric" AS ENUM ('COUNT', 'CURRENCY', 'PERCENT', 'DURATION');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'MISSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('POINTS', 'BADGE', 'DISCOUNT', 'CUSTOM');

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metric" "GoalMetric" NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_rules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "rewardValue" DOUBLE PRECISION NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "goalId" TEXT,
    "ownerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "willdash_preferences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "preferredCadence" TEXT NOT NULL DEFAULT 'WEEKLY',
    "enableRewards" BOOLEAN NOT NULL DEFAULT true,
    "dailyDigest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "willdash_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_tenantId_idx" ON "goals"("tenantId");

-- CreateIndex
CREATE INDEX "goals_tenantId_status_idx" ON "goals"("tenantId", "status");

-- CreateIndex
CREATE INDEX "reward_rules_tenantId_idx" ON "reward_rules"("tenantId");

-- CreateIndex
CREATE INDEX "reward_rules_goalId_idx" ON "reward_rules"("goalId");

-- CreateIndex
CREATE INDEX "activity_records_tenantId_idx" ON "activity_records"("tenantId");

-- CreateIndex
CREATE INDEX "activity_records_tenantId_ownerId_idx" ON "activity_records"("tenantId", "ownerId");

-- CreateIndex
CREATE INDEX "activity_records_occurredAt_idx" ON "activity_records"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "willdash_preferences_tenantId_key" ON "willdash_preferences"("tenantId");

-- AddForeignKey
ALTER TABLE "reward_rules" ADD CONSTRAINT "reward_rules_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_records" ADD CONSTRAINT "activity_records_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
