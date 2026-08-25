CREATE TYPE "FinancialEntryKind" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "FinancialEntryOrigin" AS ENUM ('ORDER', 'MANUAL');
CREATE TYPE "FinancialEntryStatus" AS ENUM ('OPEN', 'PAID', 'CANCELLED');
CREATE TYPE "FinancialEntryCategory" AS ENUM ('SALES', 'OPERATIONS', 'MARKETING', 'PEOPLE', 'TAXES', 'OTHER');
CREATE TYPE "FinancialEntryEventType" AS ENUM ('CREATED', 'PAID', 'CANCELLED');

CREATE TABLE "financial_entries" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "entryNumber" INTEGER NOT NULL,
  "kind" "FinancialEntryKind" NOT NULL,
  "origin" "FinancialEntryOrigin" NOT NULL,
  "status" "FinancialEntryStatus" NOT NULL DEFAULT 'OPEN',
  "category" "FinancialEntryCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "competenceDate" DATE NOT NULL,
  "dueDate" DATE NOT NULL,
  "paidAt" TIMESTAMP(3),
  "orderId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "financial_entries_amount_check" CHECK ("amountCents" > 0),
  CONSTRAINT "financial_entries_number_check" CHECK ("entryNumber" > 0),
  CONSTRAINT "financial_entries_due_competence_check" CHECK ("dueDate" >= "competenceDate"),
  CONSTRAINT "financial_entries_origin_order_check" CHECK (
    ("origin" = 'ORDER' AND "orderId" IS NOT NULL AND "kind" = 'INCOME' AND "category" = 'SALES') OR
    ("origin" = 'MANUAL' AND "orderId" IS NULL)
  ),
  CONSTRAINT "financial_entries_status_paid_check" CHECK (
    ("status" = 'PAID' AND "paidAt" IS NOT NULL) OR
    ("status" IN ('OPEN', 'CANCELLED') AND "paidAt" IS NULL)
  )
);

CREATE TABLE "financial_entry_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "type" "FinancialEntryEventType" NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_entry_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_entries_tenantId_id_key" ON "financial_entries"("tenantId", "id");
CREATE UNIQUE INDEX "financial_entries_tenantId_entryNumber_key" ON "financial_entries"("tenantId", "entryNumber");
CREATE UNIQUE INDEX "financial_entries_tenantId_orderId_key" ON "financial_entries"("tenantId", "orderId");
CREATE UNIQUE INDEX "financial_entries_tenantId_idempotencyKey_key" ON "financial_entries"("tenantId", "idempotencyKey");
CREATE INDEX "financial_entries_tenantId_status_dueDate_idx" ON "financial_entries"("tenantId", "status", "dueDate");
CREATE INDEX "financial_entries_tenantId_competenceDate_idx" ON "financial_entries"("tenantId", "competenceDate");
CREATE INDEX "financial_entry_events_tenantId_entryId_createdAt_idx" ON "financial_entry_events"("tenantId", "entryId", "createdAt");

ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_tenantId_orderId_fkey" FOREIGN KEY ("tenantId", "orderId") REFERENCES "commerce_orders"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_entry_events" ADD CONSTRAINT "financial_entry_events_tenantId_entryId_fkey" FOREIGN KEY ("tenantId", "entryId") REFERENCES "financial_entries"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
