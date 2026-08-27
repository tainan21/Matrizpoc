CREATE SCHEMA IF NOT EXISTS "pay";
SET search_path TO "pay";

CREATE TYPE "WalletCurrency" AS ENUM ('MTRZ', 'BRL');
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');
CREATE TYPE "LedgerTransactionKind" AS ENUM ('ISSUE', 'WITHDRAW', 'TRANSFER', 'REVERSAL', 'BRL_CASH_IN', 'BRL_CASH_OUT');
CREATE TYPE "LedgerTransactionStatus" AS ENUM ('PENDING', 'POSTED', 'REVERSED', 'FAILED');
CREATE TYPE "PostingSide" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "ProviderEventStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'RETRY', 'DEAD_LETTER', 'REJECTED');
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('RUNNING', 'HEALTHY', 'DIVERGENT', 'FAILED');
CREATE TYPE "DiscrepancyStatus" AS ENUM ('OPEN', 'RESOLVED', 'WAIVED');

CREATE TABLE "wallets" (
    "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "wallet_accounts" (
    "id" TEXT NOT NULL, "walletId" TEXT NOT NULL, "currency" "WalletCurrency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_accounts_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ledger_transactions" (
    "id" TEXT NOT NULL, "walletId" TEXT, "kind" "LedgerTransactionKind" NOT NULL,
    "status" "LedgerTransactionStatus" NOT NULL DEFAULT 'PENDING', "currency" "WalletCurrency" NOT NULL,
    "amountMinor" BIGINT NOT NULL, "idempotencyKey" TEXT NOT NULL, "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL, "correlationId" TEXT NOT NULL, "providerReference" TEXT,
    "reversesTransactionId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedAt" TIMESTAMP(3), CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ledger_transactions_amount_positive" CHECK ("amountMinor" > 0)
);
CREATE TABLE "ledger_postings" (
    "id" TEXT NOT NULL, "transactionId" TEXT NOT NULL, "accountId" TEXT NOT NULL,
    "currency" "WalletCurrency" NOT NULL, "side" "PostingSide" NOT NULL, "amountMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_postings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ledger_postings_amount_positive" CHECK ("amountMinor" > 0)
);
CREATE TABLE "provider_account_links" (
    "id" TEXT NOT NULL, "walletId" TEXT NOT NULL, "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL, "kycStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "provider_account_links_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "provider_events" (
    "id" TEXT NOT NULL, "provider" TEXT NOT NULL, "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL, "status" "ProviderEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "payloadJson" JSONB NOT NULL, "payloadHash" TEXT NOT NULL, "signature" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "processedAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3), "attempts" INTEGER NOT NULL DEFAULT 0, "lastError" TEXT,
    CONSTRAINT "provider_events_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "reconciliation_runs" (
    "id" TEXT NOT NULL, "provider" TEXT NOT NULL, "status" "ReconciliationRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "finishedAt" TIMESTAMP(3),
    "correlationId" TEXT NOT NULL, "summaryJson" JSONB,
    CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "reconciliation_discrepancies" (
    "id" TEXT NOT NULL, "reconciliationRunId" TEXT NOT NULL, "walletId" TEXT,
    "currency" "WalletCurrency" NOT NULL, "ledgerAmountMinor" BIGINT NOT NULL,
    "providerAmountMinor" BIGINT NOT NULL, "status" "DiscrepancyStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "reconciliation_discrepancies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");
CREATE INDEX "wallets_status_idx" ON "wallets"("status");
CREATE INDEX "wallet_accounts_currency_idx" ON "wallet_accounts"("currency");
CREATE UNIQUE INDEX "wallet_accounts_walletId_currency_key" ON "wallet_accounts"("walletId", "currency");
CREATE UNIQUE INDEX "ledger_transactions_idempotencyKey_key" ON "ledger_transactions"("idempotencyKey");
CREATE UNIQUE INDEX "ledger_transactions_reversesTransactionId_key" ON "ledger_transactions"("reversesTransactionId");
CREATE INDEX "ledger_transactions_walletId_createdAt_idx" ON "ledger_transactions"("walletId", "createdAt");
CREATE INDEX "ledger_transactions_correlationId_idx" ON "ledger_transactions"("correlationId");
CREATE INDEX "ledger_transactions_providerReference_idx" ON "ledger_transactions"("providerReference");
CREATE INDEX "ledger_postings_transactionId_idx" ON "ledger_postings"("transactionId");
CREATE INDEX "ledger_postings_accountId_createdAt_idx" ON "ledger_postings"("accountId", "createdAt");
CREATE UNIQUE INDEX "provider_account_links_provider_providerAccountId_key" ON "provider_account_links"("provider", "providerAccountId");
CREATE UNIQUE INDEX "provider_account_links_walletId_provider_key" ON "provider_account_links"("walletId", "provider");
CREATE INDEX "provider_events_status_nextRetryAt_idx" ON "provider_events"("status", "nextRetryAt");
CREATE UNIQUE INDEX "provider_events_provider_providerEventId_key" ON "provider_events"("provider", "providerEventId");
CREATE UNIQUE INDEX "reconciliation_runs_correlationId_key" ON "reconciliation_runs"("correlationId");
CREATE INDEX "reconciliation_runs_provider_startedAt_idx" ON "reconciliation_runs"("provider", "startedAt");
CREATE INDEX "reconciliation_discrepancies_status_createdAt_idx" ON "reconciliation_discrepancies"("status", "createdAt");
CREATE INDEX "reconciliation_discrepancies_walletId_idx" ON "reconciliation_discrepancies"("walletId");

ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_reversesTransactionId_fkey" FOREIGN KEY ("reversesTransactionId") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "wallet_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "provider_account_links" ADD CONSTRAINT "provider_account_links_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reconciliation_discrepancies" ADD CONSTRAINT "reconciliation_discrepancies_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES "reconciliation_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
