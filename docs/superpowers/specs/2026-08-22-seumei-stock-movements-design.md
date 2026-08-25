# Seumei Stock Movements Design

## Scope

This slice assimilates real stock per persisted product variant, append-only manual movements, a concurrency-safe balance projection, and tenant-scoped workspace routes. It excludes purchasing, locations, lots, reservations, orders, valuation, and storefront availability.

Route flow: `/login` → `/` → `/onboarding` → `/workspace` → `/workspace/stock` → `/workspace/stock/[variantId]`.

## Reference evidence

`SeumeiRefactor/modules/stock` establishes useful product intent: an operational inventory with balance, low-stock threshold, health, movement timeline, and reasoned entry, exit, and reconciliation. Its code is not reusable: balance and history live in separate browser repositories, writes are not atomic, excessive exits are silently clamped to zero, actor identity is free text, and product/SKU identity is duplicated.

## Decision

Stock belongs to each persisted `ProductVariant`. `InventoryItem` is its tenant-scoped materialized balance/configuration; `StockMovement` is the immutable audit source for every change.

A movement transaction resolves `(tenantId, variantId)`, checks the expected projection version, computes a non-zero signed delta, conditionally updates balance/version without allowing a negative result, inserts the movement, and commits both or neither. Every repository method requires server-derived `tenantId`.

This hybrid beats recalculating long histories for every list and beats an unexplained mutable balance. It retains auditability, efficient reads, and an atomic concurrency guard.

## Data model

`InventoryItem` has `id`, `tenantId`, `variantId`, non-negative integer `balance`, non-negative integer `lowStockThreshold`, `version` starting at 1, timestamps, unique `(tenantId, variantId)`, and tenant indexes.

`StockMovement` has `id`, `tenantId`, `inventoryItemId`, type `ENTRY | EXIT | RECONCILIATION`, signed non-zero `quantityDelta`, `balanceBefore`, `balanceAfter`, required `reason`, optional `notes`, `actorUserId`, `idempotencyKey`, and `createdAt`. `(tenantId, idempotencyKey)` is unique; history is indexed by tenant/item/time. Both models carry explicit ownership. The migration is additive.

## Rules and authorization

- A variant without an inventory item honestly has zero balance; the item is created on its first configuration or movement.
- Entry adds a positive quantity, exit subtracts it, and reconciliation records the delta to an explicit final balance.
- Quantities and thresholds are safe integers; reason is trimmed and required; notes are bounded and nullable.
- Zero-delta reconciliation, excessive exit, and obsolete `expectedVersion` are rejected without partial writes.
- Reusing an idempotency key returns the prior result only for the same command identity; a mismatched command conflicts.
- OWNER/ADMIN receive `stock.manage`; MEMBER/VIEWER receive `stock.read`. Actor identity comes from the authenticated server session.

## Boundaries and UX

Domain normalization stays under `src/domain`, authorization/orchestration under `src/application`, Prisma under `src/infrastructure`, and UI consumes app-local view models.

HTTP surfaces are `GET /api/stock`, `GET|PATCH /api/stock/[variantId]`, and `POST /api/stock/[variantId]/movements`. The browser never sends `tenantId`; handlers resolve the actor and active company through existing server authority.

`/workspace/stock` lists active variants with product, variant, SKU, balance, threshold, and derived `out | low | healthy` health. No variants produces an honest path to catalog. `/workspace/stock/[variantId]` shows balance/version, authorized threshold editing, one-operation-at-a-time movement authoring, and an append-only timeline. Conflicts require reviewing the refreshed balance before resubmission. `/docs`, workspace navigation, and manifest expose stock only once the complete slice works.

## Isolation and failures

Every variant join, item/movement read, update, and idempotency lookup is tenant-scoped. Known tenant-B IDs resolve as unavailable within tenant A. Authorization happens before record lookup. Missing database configuration stays explicit; no browser persistence or fake fallback exists. Validation, conflict, insufficient balance, forbidden, and not-found outcomes have stable errors and actionable Portuguese copy.

## Verification

TDD proceeds through schema contract, pure rules, capability policy, repository atomicity/idempotency/isolation, services, handlers, presenters, and UI. Negative tests prove cross-tenant denial, read-only roles, insufficient balance, stale version, zero delta, mismatched idempotency, no partial state, and simultaneous exits that cannot overspend.

Browser verification covers the complete flow in desktop/mobile, keyboard/focus, console/overflow, entry, exit, reconciliation, conflict recovery, refresh/new session, read-only access, and tenant A versus B. Completion requires scoped gates, smoke, Prisma validation, an additive migration on disposable PostgreSQL, and global gates because schema and manifest change.

## Non-goals and next boundary

This slice does not connect orders, reserve units, value inventory, manage warehouses, backdate movements, import files, or create variants. Future order reservations require a separately evidenced state/idempotency contract and new movement kinds; historical manual movements remain immutable.
