-- Additive Seumei restaurant composition and ingredient stock foundation.

CREATE TYPE "IngredientUnit" AS ENUM ('UNIT', 'GRAM', 'MILLILITER');
CREATE TYPE "IngredientStockMovementType" AS ENUM ('ENTRY', 'EXIT', 'RECONCILIATION', 'ORDER_CONSUMPTION');

CREATE UNIQUE INDEX "products_tenantId_id_key" ON "products"("tenantId", "id");
CREATE UNIQUE INDEX "product_variants_tenantId_id_key" ON "product_variants"("tenantId", "id");

CREATE TABLE "product_images" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "productId" TEXT NOT NULL,
  "url" TEXT NOT NULL, "altText" TEXT NOT NULL, "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ingredients" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "sku" TEXT, "unit" "IngredientUnit" NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recipes" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "variantId" TEXT NOT NULL,
  "yieldQuantity" INTEGER NOT NULL DEFAULT 1, "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recipes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recipes_yield_positive" CHECK ("yieldQuantity" > 0)
);

CREATE TABLE "recipe_ingredients" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "recipeId" TEXT NOT NULL, "ingredientId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL, "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "recipe_ingredients_quantity_positive" CHECK ("quantity" > 0)
);

CREATE TABLE "ingredient_inventory" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "ingredientId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0, "lowStockThreshold" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ingredient_inventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ingredient_inventory_non_negative" CHECK ("balance" >= 0 AND "lowStockThreshold" >= 0)
);

CREATE TABLE "ingredient_stock_movements" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "ingredientId" TEXT NOT NULL,
  "type" "IngredientStockMovementType" NOT NULL, "signedQuantity" INTEGER NOT NULL,
  "balanceBefore" INTEGER NOT NULL, "balanceAfter" INTEGER NOT NULL, "reason" TEXT NOT NULL,
  "notes" TEXT, "actorUserId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "commandHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ingredient_stock_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ingredient_stock_movement_non_zero" CHECK ("signedQuantity" <> 0),
  CONSTRAINT "ingredient_stock_movement_balances" CHECK ("balanceBefore" >= 0 AND "balanceAfter" >= 0)
);

CREATE UNIQUE INDEX "product_images_tenantId_productId_position_key" ON "product_images"("tenantId", "productId", "position");
CREATE INDEX "product_images_tenantId_productId_idx" ON "product_images"("tenantId", "productId");
CREATE UNIQUE INDEX "ingredients_tenantId_id_key" ON "ingredients"("tenantId", "id");
CREATE UNIQUE INDEX "ingredients_tenantId_slug_key" ON "ingredients"("tenantId", "slug");
CREATE UNIQUE INDEX "ingredients_tenantId_sku_key" ON "ingredients"("tenantId", "sku");
CREATE INDEX "ingredients_tenantId_isActive_idx" ON "ingredients"("tenantId", "isActive");
CREATE UNIQUE INDEX "recipes_variantId_key" ON "recipes"("variantId");
CREATE UNIQUE INDEX "recipes_tenantId_id_key" ON "recipes"("tenantId", "id");
CREATE UNIQUE INDEX "recipes_tenantId_variantId_key" ON "recipes"("tenantId", "variantId");
CREATE UNIQUE INDEX "recipe_ingredients_tenantId_recipeId_ingredientId_key" ON "recipe_ingredients"("tenantId", "recipeId", "ingredientId");
CREATE INDEX "recipe_ingredients_tenantId_recipeId_position_idx" ON "recipe_ingredients"("tenantId", "recipeId", "position");
CREATE INDEX "recipe_ingredients_tenantId_ingredientId_idx" ON "recipe_ingredients"("tenantId", "ingredientId");
CREATE UNIQUE INDEX "ingredient_inventory_ingredientId_key" ON "ingredient_inventory"("ingredientId");
CREATE UNIQUE INDEX "ingredient_inventory_tenantId_ingredientId_key" ON "ingredient_inventory"("tenantId", "ingredientId");
CREATE INDEX "ingredient_inventory_tenantId_balance_idx" ON "ingredient_inventory"("tenantId", "balance");
CREATE UNIQUE INDEX "ingredient_stock_movements_tenantId_idempotencyKey_key" ON "ingredient_stock_movements"("tenantId", "idempotencyKey");
CREATE INDEX "ingredient_stock_movements_tenantId_ingredientId_createdAt_idx" ON "ingredient_stock_movements"("tenantId", "ingredientId", "createdAt");

ALTER TABLE "product_images" ADD CONSTRAINT "product_images_tenant_product_fkey" FOREIGN KEY ("tenantId", "productId") REFERENCES "products"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_tenant_variant_fkey" FOREIGN KEY ("tenantId", "variantId") REFERENCES "product_variants"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_tenant_recipe_fkey" FOREIGN KEY ("tenantId", "recipeId") REFERENCES "recipes"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_tenant_ingredient_fkey" FOREIGN KEY ("tenantId", "ingredientId") REFERENCES "ingredients"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ingredient_inventory" ADD CONSTRAINT "ingredient_inventory_tenant_ingredient_fkey" FOREIGN KEY ("tenantId", "ingredientId") REFERENCES "ingredients"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ingredient_stock_movements" ADD CONSTRAINT "ingredient_stock_movements_tenant_ingredient_fkey" FOREIGN KEY ("tenantId", "ingredientId") REFERENCES "ingredients"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
