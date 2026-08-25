# Seumei Ingredients Recipes and Stock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver product imagery, reusable ingredients, versioned recipes and atomic ingredient stock as a complete tenant-scoped restaurant flow.

**Architecture:** All restaurant rules remain app-local. Prisma stores integer base-unit quantities, immutable movements and optimistic inventory versions. Application services derive tenant and capability from the active company context before any business lookup; presenters isolate UI from persistence.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma/PostgreSQL, Vitest, Testing Library, Matriz public design packages and original raster assets.

**Spec:** `docs/superpowers/specs/2026-08-24-seumei-demo-federation-restaurant-commerce-design.md`

## Global Constraints

- Units are integer `UNIT`, `GRAM` or `MILLILITER`; floating quantities are invalid.
- Every repository business operation requires `tenantId`.
- Recipe lines cannot connect cross-tenant variants or ingredients.
- Movements are append-only; balances never become negative.
- Product images are real app-owned raster assets with alt text, not placeholders.

---

## Task 1: Add an additive restaurant persistence contract

**Files:**
- Modify: `prisma/schemas/seumei.prisma`
- Create: `prisma/migrations/202608240001_add_seumei_recipes_stock/migration.sql`
- Create: `apps/seumeiapp/src/domain/restaurant-schema.contract.test.ts`

- [ ] Write a failing schema-contract test for `ProductImage`, `Ingredient`, `Recipe`, `RecipeIngredient`, `IngredientInventory` and `IngredientStockMovement` with tenant indexes and compound uniqueness.
- [ ] Assert relations support product image ordering, one recipe per variant, one inventory per ingredient and tenant-scoped idempotency.
- [ ] Add enums and additive models; include check constraints for positive recipe quantities/non-negative balances in SQL where Prisma cannot express them.
- [ ] Generate the existing Seumei client, run the focused contract test and inspect migration SQL for destructive statements.
- [ ] Run `pnpm run prisma:validate`.
- [ ] Commit: `feat(seumei): add recipe and ingredient stock schema`.

## Task 2: Define restaurant rules and capabilities

**Files:**
- Create: `apps/seumeiapp/src/domain/recipe.ts`
- Create: `apps/seumeiapp/src/domain/recipe.test.ts`
- Create: `apps/seumeiapp/src/domain/ingredient-stock.ts`
- Create: `apps/seumeiapp/src/domain/ingredient-stock.test.ts`
- Modify: `apps/seumeiapp/src/domain/membership.ts`
- Modify: `apps/seumeiapp/src/domain/membership.test.ts`

- [ ] Write failing table tests for normalization, integer quantities, recipe yield/version and minimum whole-quotient availability.
- [ ] Write failing tests for entry, exit, reconciliation, zero delta, excessive exit, threshold health and safe-integer boundaries.
- [ ] Add `recipes.read/manage` and `stock.read/manage`; OWNER/ADMIN manage, MEMBER/VIEWER read.
- [ ] Implement the smallest pure rules and run focused tests.
- [ ] Commit: `feat(seumei): define recipe and stock rules`.

## Task 3: Persist tenant-scoped ingredients, recipes and stock

**Files:**
- Create: `apps/seumeiapp/src/domain/repositories/restaurant-repository.ts`
- Create: `apps/seumeiapp/src/infrastructure/restaurant.repository.ts`
- Create: `apps/seumeiapp/src/infrastructure/restaurant.repository.test.ts`
- Modify: `apps/seumeiapp/src/application/composition.ts`

- [ ] Write failing repository tests for listing/reading, known tenant-B IDs, cross-tenant recipe lines and product image ordering.
- [ ] Write failing tests for first inventory movement, matching idempotent replay, mismatched key conflict, stale version and concurrent exits.
- [ ] Implement queries with tenant in every selector; use one transaction for conditional balance update plus movement append.
- [ ] Return the same not-found result for missing and foreign IDs.
- [ ] Run repository tests against controlled adapters/disposable PostgreSQL as available.
- [ ] Commit: `feat(seumei): persist tenant restaurant operations`.

## Task 4: Authorize application services and HTTP contracts

**Files:**
- Create: `apps/seumeiapp/src/application/restaurant-service.ts`
- Create: `apps/seumeiapp/src/application/restaurant-service.test.ts`
- Create: `apps/seumeiapp/src/http/restaurant-handlers.ts`
- Create: `apps/seumeiapp/src/http/restaurant-handlers.test.ts`
- Create: `apps/seumeiapp/app/api/ingredients/route.ts`
- Create: `apps/seumeiapp/app/api/recipes/[productId]/route.ts`
- Create: `apps/seumeiapp/app/api/stock/route.ts`
- Create: `apps/seumeiapp/app/api/stock/[ingredientId]/movements/route.ts`

- [ ] Write failing service/handler tests for read, create/update recipe, stock movement, forbidden, malformed, conflict, insufficient balance and unavailable database.
- [ ] Prove request bodies containing `tenantId` cannot influence authority.
- [ ] Resolve active company and capabilities before record lookup.
- [ ] Implement stable error outcomes and view contracts rather than raw Prisma records.
- [ ] Run focused tests.
- [ ] Commit: `feat(seumei): expose recipe and ingredient stock services`.

## Task 5: Extend catalog with complete products and original images

**Files:**
- Modify: `apps/seumeiapp/src/domain/catalog.ts`
- Modify: `apps/seumeiapp/src/domain/repositories/catalog-repository.ts`
- Modify: `apps/seumeiapp/src/infrastructure/catalog.repository.ts`
- Modify: `apps/seumeiapp/src/application/catalog-service.ts`
- Modify: `apps/seumeiapp/src/ui/CatalogEditor.tsx`
- Add: `apps/seumeiapp/public/demo/galaxia-burger/*.webp`

- [ ] Write failing catalog tests for ordered images, required alt text and preservation through create/update/read.
- [ ] Generate original product assets sized for the measured catalog/detail slots; visually inspect crops before wiring.
- [ ] Extend catalog persistence and presenter contracts without exposing database rows.
- [ ] Fix the existing product empty-state overlap and verify focus/CTA behavior.
- [ ] Run catalog/UI tests.
- [ ] Commit: `feat(seumei): enrich restaurant products with imagery`.

## Task 6: Deliver Culinary and Operations route flows

**Files:**
- Create: `apps/seumeiapp/src/ui/presenters/recipe.presenter.ts`
- Create: `apps/seumeiapp/src/ui/presenters/recipe.presenter.test.ts`
- Create: `apps/seumeiapp/src/ui/presenters/stock.presenter.ts`
- Create: `apps/seumeiapp/src/ui/presenters/stock.presenter.test.ts`
- Create: `apps/seumeiapp/app/workspace/products/[productId]/recipe/page.tsx`
- Create: `apps/seumeiapp/app/workspace/ingredients/page.tsx`
- Create: `apps/seumeiapp/app/workspace/stock/page.tsx`
- Create: `apps/seumeiapp/app/workspace/stock/[ingredientId]/page.tsx`
- Modify: `apps/seumeiapp/src/ui/CompanyWorkspaceShell.tsx`
- Modify: `apps/seumeiapp/app/globals.css`

- [ ] Write presenter/component tests for formatted units, availability, health, permissions, timeline and honest states.
- [ ] Implement `culinary-v1` after opening a product recipe: image, description, price, yield, lines and derived producible quantity.
- [ ] Implement `operations-v1` ingredient list, health and append-only stock detail.
- [ ] Add conflict recovery that reloads the current version before resubmission.
- [ ] Add navigation only after routes are behaviorally complete.
- [ ] Run UI tests, lint, typecheck and build.
- [ ] Commit: `feat(seumei): add culinary recipe and stock flows`.

## Task 7: Seed, verify and document the restaurant foundation

**Files:**
- Modify: `apps/seumeiapp/src/application/provision-demo-federation.ts`
- Modify: `apps/seumeiapp/src/application/provision-demo-federation.test.ts`
- Modify: `docs/seumei-migration-ledger.md`
- Modify: `apps/seumeiapp/docs/AGENT-START-HERE.md`
- Create: `docs/audit/2026-08-24-seumei-recipes-stock-acceptance.md`

- [ ] Add idempotent Galaxia catalog, eight common ingredients, recipes and real opening balances as ordinary tenant data.
- [ ] Prove Sabor & Brasa has distinct records and cannot read Galaxia IDs.
- [ ] In a real browser verify product-to-recipe, stock adjustment, refresh/new session, desktop/mobile, keyboard, console and overflow.
- [ ] Compare the approved Culinary/Operations reference images with same-viewport screenshots and fix visible hierarchy/crop/spacing defects.
- [ ] Run all scoped gates plus smoke and Prisma validation.
- [ ] Mark the old variant-stock plan superseded and update the ledger from evidence.
- [ ] Commit: `test(seumei): prove recipe stock tenant isolation`.

