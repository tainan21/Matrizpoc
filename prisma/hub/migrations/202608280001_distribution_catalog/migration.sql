-- CreateTable
CREATE TABLE "distribution_products" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "edition" TEXT NOT NULL,
    "runtime" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "arch" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'active',
    "uninstallKey" TEXT NOT NULL,
    "windowsName" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "executableName" TEXT NOT NULL,
    "aliases" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "distribution_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "distribution_releases" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "releaseNotes" TEXT,
    "installer" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "distribution_releases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "distribution_audits" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "productId" TEXT,
    "releaseId" TEXT,
    "beforeDigest" TEXT,
    "afterDigest" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "distribution_audits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "distribution_idempotency" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "distribution_idempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "distribution_products_productId_key" ON "distribution_products"("productId");
CREATE INDEX "distribution_products_state_platform_arch_idx" ON "distribution_products"("state", "platform", "arch");
CREATE UNIQUE INDEX "distribution_releases_productId_channel_version_key" ON "distribution_releases"("productId", "channel", "version");
CREATE INDEX "distribution_releases_productId_status_channel_idx" ON "distribution_releases"("productId", "status", "channel");
CREATE INDEX "distribution_audits_occurredAt_idx" ON "distribution_audits"("occurredAt");
CREATE INDEX "distribution_audits_productId_occurredAt_idx" ON "distribution_audits"("productId", "occurredAt");
CREATE UNIQUE INDEX "distribution_idempotency_idempotencyKey_key" ON "distribution_idempotency"("idempotencyKey");
CREATE INDEX "distribution_idempotency_actorId_createdAt_idx" ON "distribution_idempotency"("actorId", "createdAt");

ALTER TABLE "distribution_releases" ADD CONSTRAINT "distribution_releases_productId_fkey" FOREIGN KEY ("productId") REFERENCES "distribution_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "distribution_audits" ADD CONSTRAINT "distribution_audits_productId_fkey" FOREIGN KEY ("productId") REFERENCES "distribution_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "distribution_audits" ADD CONSTRAINT "distribution_audits_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "distribution_releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

