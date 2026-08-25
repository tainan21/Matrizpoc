-- CreateTable
CREATE TABLE "capability_practicy_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_practicy_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_practicy_catalog_items" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "availability" TEXT NOT NULL,
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_practicy_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_practicy_installations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "practicyKey" TEXT NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_practicy_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_practicy_usage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "practicyKey" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "capability_practicy_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_recent_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "resourceKey" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "capability_recent_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_dashboard_layouts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_dashboard_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_theme_preferences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "themeKey" TEXT,
    "themeVersion" INTEGER,
    "dismissedOrganizationThemeAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_theme_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_tenant_theme_recommendations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "themeKey" TEXT NOT NULL,
    "themeVersion" INTEGER NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_tenant_theme_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_accessibility_preferences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contrast" TEXT NOT NULL DEFAULT 'default',
    "motion" TEXT NOT NULL DEFAULT 'default',
    "fontScale" TEXT NOT NULL DEFAULT 'default',
    "density" TEXT NOT NULL DEFAULT 'default',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_accessibility_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_theme_entitlements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "themeKey" TEXT NOT NULL,
    "themeVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capability_theme_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_marketplace_demo_orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capability_marketplace_demo_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_marketplace_demo_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "themeKey" TEXT NOT NULL,
    "themeVersion" INTEGER NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "capability_marketplace_demo_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capability_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capability_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "capability_practicy_categories_slug_key" ON "capability_practicy_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "capability_practicy_catalog_items_key_key" ON "capability_practicy_catalog_items"("key");

-- CreateIndex
CREATE INDEX "capability_practicy_catalog_items_categoryId_idx" ON "capability_practicy_catalog_items"("categoryId");

-- CreateIndex
CREATE INDEX "capability_practicy_catalog_items_availability_idx" ON "capability_practicy_catalog_items"("availability");

-- CreateIndex
CREATE INDEX "capability_practicy_installations_tenantId_userId_installed_idx" ON "capability_practicy_installations"("tenantId", "userId", "installedAt");

-- CreateIndex
CREATE UNIQUE INDEX "capability_practicy_installations_tenantId_userId_practicyK_key" ON "capability_practicy_installations"("tenantId", "userId", "practicyKey");

-- CreateIndex
CREATE INDEX "capability_practicy_usage_tenantId_userId_occurredAt_idx" ON "capability_practicy_usage"("tenantId", "userId", "occurredAt");

-- CreateIndex
CREATE INDEX "capability_practicy_usage_practicyKey_occurredAt_idx" ON "capability_practicy_usage"("practicyKey", "occurredAt");

-- CreateIndex
CREATE INDEX "capability_recent_items_tenantId_userId_openedAt_idx" ON "capability_recent_items"("tenantId", "userId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "capability_recent_items_tenantId_userId_kind_resourceKey_key" ON "capability_recent_items"("tenantId", "userId", "kind", "resourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "capability_dashboard_layouts_tenantId_userId_key" ON "capability_dashboard_layouts"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "capability_theme_preferences_tenantId_userId_idx" ON "capability_theme_preferences"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "capability_theme_preferences_tenantId_userId_appId_key" ON "capability_theme_preferences"("tenantId", "userId", "appId");

-- CreateIndex
CREATE UNIQUE INDEX "capability_tenant_theme_recommendations_tenantId_key" ON "capability_tenant_theme_recommendations"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "capability_accessibility_preferences_tenantId_userId_key" ON "capability_accessibility_preferences"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "capability_theme_entitlements_tenantId_ownerType_ownerId_idx" ON "capability_theme_entitlements"("tenantId", "ownerType", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "capability_theme_entitlements_tenantId_ownerType_ownerId_th_key" ON "capability_theme_entitlements"("tenantId", "ownerType", "ownerId", "themeKey");

-- CreateIndex
CREATE INDEX "capability_marketplace_demo_orders_tenantId_userId_createdA_idx" ON "capability_marketplace_demo_orders"("tenantId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "capability_marketplace_demo_order_items_orderId_idx" ON "capability_marketplace_demo_order_items"("orderId");

-- CreateIndex
CREATE INDEX "capability_events_tenantId_occurredAt_idx" ON "capability_events"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "capability_events_tenantId_name_occurredAt_idx" ON "capability_events"("tenantId", "name", "occurredAt");

-- AddForeignKey
ALTER TABLE "capability_practicy_catalog_items" ADD CONSTRAINT "capability_practicy_catalog_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "capability_practicy_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capability_marketplace_demo_order_items" ADD CONSTRAINT "capability_marketplace_demo_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "capability_marketplace_demo_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
DECLARE tenant_table text;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'capability_accessibility_preferences', 'capability_dashboard_layouts', 'capability_events',
    'capability_marketplace_demo_orders', 'capability_practicy_installations', 'capability_practicy_usage',
    'capability_recent_items', 'capability_tenant_theme_recommendations', 'capability_theme_entitlements',
    'capability_theme_preferences'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('CREATE POLICY %I ON %I TO "matriz_hub_runtime" USING ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), '''')) WITH CHECK ("tenantId" = NULLIF(current_setting(''matriz.tenant_id'', true), ''''))', tenant_table || '_tenant_isolation', tenant_table);
  END LOOP;
END $$;
