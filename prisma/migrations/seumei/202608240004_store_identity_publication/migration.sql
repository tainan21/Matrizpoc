CREATE TYPE "StoreIdentityPreset" AS ENUM ('COSMIC_DINER', 'BRAZILIAN_WARMTH', 'MARKET_FRESH');

ALTER TABLE "store_publications"
  ADD COLUMN "draftPreset" "StoreIdentityPreset" NOT NULL DEFAULT 'MARKET_FRESH',
  ADD COLUMN "draftHeadline" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "draftAnnouncement" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "draftDescription" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "draftHeroImageUrl" TEXT,
  ADD COLUMN "draftVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "publishedVersionId" TEXT;

CREATE UNIQUE INDEX "store_publications_tenantId_id_key"
  ON "store_publications"("tenantId", "id");
CREATE UNIQUE INDEX "store_publications_tenantId_publishedVersionId_key"
  ON "store_publications"("tenantId", "publishedVersionId");

CREATE TABLE "store_publication_versions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "storeSlug" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "preset" "StoreIdentityPreset" NOT NULL,
  "headline" TEXT NOT NULL,
  "announcement" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "heroImageUrl" TEXT,
  "publishedByUserId" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_publication_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_publication_versions_tenantId_id_key"
  ON "store_publication_versions"("tenantId", "id");
CREATE UNIQUE INDEX "store_publication_versions_tenantId_publicationId_version_key"
  ON "store_publication_versions"("tenantId", "publicationId", "version");
CREATE INDEX "store_publication_versions_tenantId_publishedAt_idx"
  ON "store_publication_versions"("tenantId", "publishedAt");

ALTER TABLE "store_publication_versions"
  ADD CONSTRAINT "store_publication_versions_tenantId_publicationId_fkey"
  FOREIGN KEY ("tenantId", "publicationId") REFERENCES "store_publications"("tenantId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "store_publications"
SET
  "draftPreset" = CASE
    WHEN "storeSlug" = 'galaxia-burger' THEN 'COSMIC_DINER'::"StoreIdentityPreset"
    WHEN "storeSlug" = 'sabor-e-brasa' THEN 'BRAZILIAN_WARMTH'::"StoreIdentityPreset"
    ELSE 'MARKET_FRESH'::"StoreIdentityPreset"
  END,
  "draftHeadline" = CASE
    WHEN "storeSlug" = 'galaxia-burger' THEN 'Smash de outro mundo.'
    WHEN "storeSlug" = 'sabor-e-brasa' THEN 'Brasil servido na brasa.'
    ELSE "displayName"
  END,
  "draftAnnouncement" = CASE
    WHEN "storeSlug" = 'galaxia-burger' THEN 'Retirada em 20 minutos'
    WHEN "storeSlug" = 'sabor-e-brasa' THEN 'Feito hoje, com calma'
    ELSE ''
  END,
  "draftDescription" = COALESCE(description, 'Conheça nosso catálogo e faça uma compra simulada.');

INSERT INTO "store_publication_versions" (
  "id", "tenantId", "publicationId", "version", "storeSlug", "displayName", "preset",
  "headline", "announcement", "description", "heroImageUrl", "publishedByUserId", "publishedAt"
)
SELECT
  id || ':v' || version::text,
  "tenantId",
  id,
  version,
  "storeSlug",
  "displayName",
  "draftPreset",
  "draftHeadline",
  "draftAnnouncement",
  "draftDescription",
  "draftHeroImageUrl",
  'migration:store-identity',
  COALESCE("publishedAt", "updatedAt")
FROM "store_publications"
WHERE "isPublished" = true;

UPDATE "store_publications"
SET "publishedVersionId" = id || ':v' || version::text
WHERE "isPublished" = true;

ALTER TABLE "store_publications"
  ADD CONSTRAINT "store_publications_tenantId_publishedVersionId_fkey"
  FOREIGN KEY ("tenantId", "publishedVersionId") REFERENCES "store_publication_versions"("tenantId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
