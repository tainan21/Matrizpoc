-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PROVISIONING', 'ONBOARDING', 'ACTIVE', 'PROVISIONING_FAILED');

-- CreateEnum
CREATE TYPE "CompanyOperationType" AS ENUM ('PHYSICAL_STORE', 'ONLINE_STORE', 'SERVICE', 'HYBRID');

-- CreateEnum
CREATE TYPE "CompanyOnboardingStep" AS ENUM ('IDENTITY', 'OPERATION', 'PREFERENCES', 'REVIEW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'CONFIGURABLE');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IngredientUnit" AS ENUM ('UNIT', 'GRAM', 'MILLILITER');

-- CreateEnum
CREATE TYPE "IngredientStockMovementType" AS ENUM ('ENTRY', 'EXIT', 'RECONCILIATION', 'ORDER_CONSUMPTION');

-- CreateEnum
CREATE TYPE "StoreIdentityPreset" AS ENUM ('COSMIC_DINER', 'BRAZILIAN_WARMTH', 'MARKET_FRESH');

-- CreateEnum
CREATE TYPE "CommerceOrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DemoPaymentStatus" AS ENUM ('SIMULATED_APPROVED', 'SIMULATED_REFUNDED');

-- CreateEnum
CREATE TYPE "CommerceOrderChannel" AS ENUM ('DEMO_STOREFRONT', 'MANUAL');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('PICKUP');

-- CreateEnum
CREATE TYPE "FinancialEntryKind" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialEntryOrigin" AS ENUM ('ORDER', 'MANUAL');

-- CreateEnum
CREATE TYPE "FinancialEntryStatus" AS ENUM ('OPEN', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinancialEntryCategory" AS ENUM ('SALES', 'OPERATIONS', 'MARKETING', 'PEOPLE', 'TAXES', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialEntryEventType" AS ENUM ('CREATED', 'PAID', 'CANCELLED');

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "ProductType" NOT NULL DEFAULT 'SIMPLE',
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "priceCents" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT,
    "unit" "IngredientUnit" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "yieldQuantity" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_inventory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredient_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_stock_movements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "type" "IngredientStockMovementType" NOT NULL,
    "signedQuantity" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "actorUserId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "commandHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredient_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_publications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "storeSlug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "draftPreset" "StoreIdentityPreset" NOT NULL DEFAULT 'MARKET_FRESH',
    "draftHeadline" TEXT NOT NULL DEFAULT '',
    "draftAnnouncement" TEXT NOT NULL DEFAULT '',
    "draftDescription" TEXT NOT NULL DEFAULT '',
    "draftHeroImageUrl" TEXT,
    "draftVersion" INTEGER NOT NULL DEFAULT 1,
    "publishedVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedEmail" TEXT,
    "normalizedPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "status" "CommerceOrderStatus" NOT NULL DEFAULT 'PLACED',
    "paymentStatus" "DemoPaymentStatus" NOT NULL DEFAULT 'SIMULATED_APPROVED',
    "channel" "CommerceOrderChannel" NOT NULL DEFAULT 'DEMO_STOREFRONT',
    "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'PICKUP',
    "subtotalCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "idempotencyKey" TEXT NOT NULL,
    "commandHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commerce_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "variantNameSnapshot" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "recipeVersionSnapshot" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_timeline_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "CommerceOrderStatus" NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_stock_consumptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_stock_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

    CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "companies_tenantId_key" ON "companies"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_createdByUserId_status_idx" ON "companies"("createdByUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "companies_createdByUserId_idempotencyKey_key" ON "companies"("createdByUserId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "companies_tenantId_id_key" ON "companies"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "company_onboarding_companyId_key" ON "company_onboarding"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "company_onboarding_tenantId_key" ON "company_onboarding"("tenantId");

-- CreateIndex
CREATE INDEX "company_onboarding_tenantId_currentStep_idx" ON "company_onboarding"("tenantId", "currentStep");

-- CreateIndex
CREATE INDEX "product_categories_tenantId_isActive_idx" ON "product_categories"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_tenantId_slug_key" ON "product_categories"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "products_tenantId_status_idx" ON "products"("tenantId", "status");

-- CreateIndex
CREATE INDEX "products_tenantId_categoryId_idx" ON "products"("tenantId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenantId_slug_key" ON "products"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenantId_id_key" ON "products"("tenantId", "id");

-- CreateIndex
CREATE INDEX "product_variants_tenantId_productId_position_idx" ON "product_variants"("tenantId", "productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_tenantId_sku_key" ON "product_variants"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_tenantId_id_key" ON "product_variants"("tenantId", "id");

-- CreateIndex
CREATE INDEX "product_images_tenantId_productId_idx" ON "product_images"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_images_tenantId_productId_position_key" ON "product_images"("tenantId", "productId", "position");

-- CreateIndex
CREATE INDEX "ingredients_tenantId_isActive_idx" ON "ingredients"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_tenantId_id_key" ON "ingredients"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_tenantId_slug_key" ON "ingredients"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_tenantId_sku_key" ON "ingredients"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_variantId_key" ON "recipes"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_tenantId_id_key" ON "recipes"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_tenantId_variantId_key" ON "recipes"("tenantId", "variantId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_tenantId_recipeId_position_idx" ON "recipe_ingredients"("tenantId", "recipeId", "position");

-- CreateIndex
CREATE INDEX "recipe_ingredients_tenantId_ingredientId_idx" ON "recipe_ingredients"("tenantId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_tenantId_recipeId_ingredientId_key" ON "recipe_ingredients"("tenantId", "recipeId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_inventory_ingredientId_key" ON "ingredient_inventory"("ingredientId");

-- CreateIndex
CREATE INDEX "ingredient_inventory_tenantId_balance_idx" ON "ingredient_inventory"("tenantId", "balance");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_inventory_tenantId_ingredientId_key" ON "ingredient_inventory"("tenantId", "ingredientId");

-- CreateIndex
CREATE INDEX "ingredient_stock_movements_tenantId_ingredientId_createdAt_idx" ON "ingredient_stock_movements"("tenantId", "ingredientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_stock_movements_tenantId_id_key" ON "ingredient_stock_movements"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_stock_movements_tenantId_idempotencyKey_key" ON "ingredient_stock_movements"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "store_publications_tenantId_key" ON "store_publications"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "store_publications_companyId_key" ON "store_publications"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "store_publications_storeSlug_key" ON "store_publications"("storeSlug");

-- CreateIndex
CREATE INDEX "store_publications_storeSlug_isPublished_idx" ON "store_publications"("storeSlug", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "store_publications_tenantId_id_key" ON "store_publications"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "store_publications_tenantId_companyId_key" ON "store_publications"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "store_publications_tenantId_publishedVersionId_key" ON "store_publications"("tenantId", "publishedVersionId");

-- CreateIndex
CREATE INDEX "store_publication_versions_tenantId_publishedAt_idx" ON "store_publication_versions"("tenantId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "store_publication_versions_tenantId_id_key" ON "store_publication_versions"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "store_publication_versions_tenantId_publicationId_version_key" ON "store_publication_versions"("tenantId", "publicationId", "version");

-- CreateIndex
CREATE INDEX "customers_tenantId_name_idx" ON "customers"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenantId_id_key" ON "customers"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenantId_normalizedEmail_key" ON "customers"("tenantId", "normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenantId_normalizedPhone_key" ON "customers"("tenantId", "normalizedPhone");

-- CreateIndex
CREATE INDEX "commerce_orders_tenantId_status_createdAt_idx" ON "commerce_orders"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "commerce_orders_tenantId_customerId_createdAt_idx" ON "commerce_orders"("tenantId", "customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_orders_tenantId_id_key" ON "commerce_orders"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_orders_tenantId_orderNumber_key" ON "commerce_orders"("tenantId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "commerce_orders_tenantId_idempotencyKey_key" ON "commerce_orders"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "order_items_tenantId_orderId_idx" ON "order_items"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "order_items_tenantId_variantId_idx" ON "order_items"("tenantId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_tenantId_id_key" ON "order_items"("tenantId", "id");

-- CreateIndex
CREATE INDEX "order_timeline_events_tenantId_orderId_createdAt_idx" ON "order_timeline_events"("tenantId", "orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "order_stock_consumptions_movementId_key" ON "order_stock_consumptions"("movementId");

-- CreateIndex
CREATE INDEX "order_stock_consumptions_tenantId_ingredientId_createdAt_idx" ON "order_stock_consumptions"("tenantId", "ingredientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "order_stock_consumptions_tenantId_orderItemId_ingredientId_key" ON "order_stock_consumptions"("tenantId", "orderItemId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "order_stock_consumptions_tenantId_movementId_key" ON "order_stock_consumptions"("tenantId", "movementId");

-- CreateIndex
CREATE INDEX "financial_entries_tenantId_status_dueDate_idx" ON "financial_entries"("tenantId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "financial_entries_tenantId_competenceDate_idx" ON "financial_entries"("tenantId", "competenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_tenantId_id_key" ON "financial_entries"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_tenantId_entryNumber_key" ON "financial_entries"("tenantId", "entryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_tenantId_orderId_key" ON "financial_entries"("tenantId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_tenantId_idempotencyKey_key" ON "financial_entries"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "financial_entry_events_tenantId_entryId_createdAt_idx" ON "financial_entry_events"("tenantId", "entryId", "createdAt");

-- AddForeignKey
ALTER TABLE "company_onboarding" ADD CONSTRAINT "company_onboarding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_tenantId_productId_fkey" FOREIGN KEY ("tenantId", "productId") REFERENCES "products"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_tenantId_variantId_fkey" FOREIGN KEY ("tenantId", "variantId") REFERENCES "product_variants"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_tenantId_recipeId_fkey" FOREIGN KEY ("tenantId", "recipeId") REFERENCES "recipes"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_tenantId_ingredientId_fkey" FOREIGN KEY ("tenantId", "ingredientId") REFERENCES "ingredients"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_inventory" ADD CONSTRAINT "ingredient_inventory_tenantId_ingredientId_fkey" FOREIGN KEY ("tenantId", "ingredientId") REFERENCES "ingredients"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_stock_movements" ADD CONSTRAINT "ingredient_stock_movements_tenantId_ingredientId_fkey" FOREIGN KEY ("tenantId", "ingredientId") REFERENCES "ingredients"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_publications" ADD CONSTRAINT "store_publications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_publications" ADD CONSTRAINT "store_publications_tenantId_publishedVersionId_fkey" FOREIGN KEY ("tenantId", "publishedVersionId") REFERENCES "store_publication_versions"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_publication_versions" ADD CONSTRAINT "store_publication_versions_tenantId_publicationId_fkey" FOREIGN KEY ("tenantId", "publicationId") REFERENCES "store_publications"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_tenantId_customerId_fkey" FOREIGN KEY ("tenantId", "customerId") REFERENCES "customers"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenantId_orderId_fkey" FOREIGN KEY ("tenantId", "orderId") REFERENCES "commerce_orders"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenantId_variantId_fkey" FOREIGN KEY ("tenantId", "variantId") REFERENCES "product_variants"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_timeline_events" ADD CONSTRAINT "order_timeline_events_tenantId_orderId_fkey" FOREIGN KEY ("tenantId", "orderId") REFERENCES "commerce_orders"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_stock_consumptions" ADD CONSTRAINT "order_stock_consumptions_tenantId_orderItemId_fkey" FOREIGN KEY ("tenantId", "orderItemId") REFERENCES "order_items"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_stock_consumptions" ADD CONSTRAINT "order_stock_consumptions_tenantId_ingredientId_fkey" FOREIGN KEY ("tenantId", "ingredientId") REFERENCES "ingredients"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_stock_consumptions" ADD CONSTRAINT "order_stock_consumptions_tenantId_movementId_fkey" FOREIGN KEY ("tenantId", "movementId") REFERENCES "ingredient_stock_movements"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_tenantId_orderId_fkey" FOREIGN KEY ("tenantId", "orderId") REFERENCES "commerce_orders"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_entry_events" ADD CONSTRAINT "financial_entry_events_tenantId_entryId_fkey" FOREIGN KEY ("tenantId", "entryId") REFERENCES "financial_entries"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
DECLARE tenant_table text;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'commerce_orders', 'companies', 'company_onboarding', 'customers', 'financial_entries',
    'financial_entry_events', 'ingredient_inventory', 'ingredient_stock_movements', 'ingredients',
    'order_items', 'order_stock_consumptions', 'order_timeline_events', 'product_categories',
    'product_images', 'product_variants', 'products', 'recipe_ingredients', 'recipes',
    'store_publication_versions', 'store_publications'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('CREATE POLICY %I ON %I TO "matriz_seumei_runtime" USING ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), '''')) WITH CHECK ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), ''''))', tenant_table || '_tenant_isolation', tenant_table);
  END LOOP;
END $$;

-- Domain invariants Prisma cannot express in the schema.
ALTER TABLE "financial_entries"
  ADD CONSTRAINT "financial_entries_amount_check" CHECK ("amountCents" > 0),
  ADD CONSTRAINT "financial_entries_number_check" CHECK ("entryNumber" > 0),
  ADD CONSTRAINT "financial_entries_due_competence_check" CHECK ("dueDate" >= "competenceDate"),
  ADD CONSTRAINT "financial_entries_origin_order_check" CHECK (
    ("origin" = 'ORDER' AND "orderId" IS NOT NULL AND "kind" = 'INCOME' AND "category" = 'SALES') OR
    ("origin" = 'MANUAL' AND "orderId" IS NULL)
  ),
  ADD CONSTRAINT "financial_entries_status_paid_check" CHECK (
    ("status" = 'PAID' AND "paidAt" IS NOT NULL) OR
    ("status" IN ('OPEN', 'CANCELLED') AND "paidAt" IS NULL)
  );

-- Preserve the published identity of stores that predate immutable versions.
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
