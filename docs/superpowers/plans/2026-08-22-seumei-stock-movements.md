# Seumei Stock Movements Implementation Plan

> **For agentic workers:** Use `superpowers:test-driven-development` task by task and `superpowers:verification-before-completion` before claiming the slice complete.

**Goal:** Deliver real, tenant-scoped stock per product variant with append-only movements, resumable browser flows and concurrency-safe balances.

**Architecture:** Keep stock domain, application services, presenters and UI inside `apps/seumeiapp`. Persist `InventoryItem` and `StockMovement` in the Seumei Prisma schema. Derive tenant, membership and actor exclusively from server authority. A single transaction updates the versioned balance and appends its audit movement.

**Tech stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, Vitest, Testing Library, Playwright, MatrizLib public exports.

**Spec:** `docs/superpowers/specs/2026-08-22-seumei-stock-movements-design.md`

## Global constraints

- Do not add `tenantId` to browser commands.
- Do not expose a business repository method without tenant scope.
- Do not create a second Prisma client or browser persistence.
- Do not couple order reservation, warehouses, valuation or storefront availability to this slice.
- Make every schema change additive and include a coherent migration.
- Use app-local view models; UI never consumes Prisma records directly.

### Task 1: Lock the persistence contract with failing tests

**Files:**
- Modify: `prisma/schemas/seumei.prisma`
- Create: `prisma/migrations/<timestamp>_add_seumei_stock_movements/migration.sql`
- Create: `apps/seumeiapp/src/infrastructure/stock-schema-contract.test.ts`

1. Write a failing schema-contract test for `InventoryItem`, `StockMovement`, tenant indexes, `(tenantId, variantId)` uniqueness and `(tenantId, idempotencyKey)` uniqueness.
2. Add the two models, enums, explicit tenant ownership and non-destructive SQL migration.
3. Generate the Seumei client in the existing database surface and run the focused contract test.
4. Run `pnpm run prisma:validate` and inspect the migration SQL for destructive statements.
5. Commit: `feat(seumei): add stock persistence contract`.

### Task 2: Define stock rules and capabilities through TDD

**Files:**
- Create: `apps/seumeiapp/src/domain/stock.ts`
- Create: `apps/seumeiapp/src/domain/stock.test.ts`
- Modify: `apps/seumeiapp/src/application/membership-capabilities.ts`
- Modify: `apps/seumeiapp/src/application/membership-capabilities.test.ts`

1. Write failing tests for entry, exit, reconciliation, zero delta, excessive exit, thresholds, safe integers and bounded reason/notes.
2. Implement pure commands and outcomes without Prisma or HTTP types.
3. Add `stock.read` for every Seumei member and `stock.manage` for OWNER/ADMIN only.
4. Prove MEMBER/VIEWER cannot mutate and run focused tests.
5. Commit: `feat(seumei): define stock rules and capabilities`.

### Task 3: Build the tenant-scoped repository and atomic write

**Files:**
- Create: `apps/seumeiapp/src/application/stock-repository.ts`
- Create: `apps/seumeiapp/src/infrastructure/prisma-stock.repository.ts`
- Create: `apps/seumeiapp/src/infrastructure/prisma-stock.repository.test.ts`

1. Specify repository interfaces whose every operation requires `tenantId`.
2. Write PostgreSQL tests for list/read, known tenant-B variant IDs, first movement creation and tenant-scoped idempotency.
3. Implement the Prisma adapter using one transaction: resolve variant in tenant, verify expected version, conditionally update non-negative balance/version, append movement, commit both or neither.
4. Add simultaneous-exit tests proving the balance cannot overspend and stale versions conflict.
5. Prove a reused idempotency key returns the original command only when its identity matches.
6. Commit: `feat(seumei): persist atomic stock movements`.

### Task 4: Orchestrate authorization and stable application errors

**Files:**
- Create: `apps/seumeiapp/src/application/stock.ts`
- Create: `apps/seumeiapp/src/application/stock.test.ts`
- Modify: `apps/seumeiapp/src/application/composition.ts`

1. Write failing service tests for read, threshold update and movement creation.
2. Resolve active company, membership and actor before all record lookup.
3. Map validation, conflict, insufficient balance, forbidden, not-found and unavailable database states to stable application outcomes.
4. Prove tenant A receives the same unavailable outcome for a missing ID and a known tenant-B ID.
5. Commit: `feat(seumei): authorize stock application services`.

### Task 5: Expose server-authoritative HTTP contracts

**Files:**
- Create: `apps/seumeiapp/app/api/stock/route.ts`
- Create: `apps/seumeiapp/app/api/stock/[variantId]/route.ts`
- Create: `apps/seumeiapp/app/api/stock/[variantId]/movements/route.ts`
- Create: adjacent `*.test.ts` handler tests following existing conventions

1. Write failing handler tests for signed-out, forbidden, malformed, conflict, insufficient balance, unavailable and success responses.
2. Implement `GET /api/stock`, `GET|PATCH /api/stock/[variantId]` and `POST /api/stock/[variantId]/movements`.
3. Reject or ignore any injected tenant authority; only server context selects tenant.
4. Verify response payloads are view contracts, not raw domain or Prisma records.
5. Commit: `feat(seumei): expose stock HTTP contracts`.

### Task 6: Deliver the stock route flow with presenters

**Files:**
- Create: `apps/seumeiapp/src/presentation/stock-presenter.ts`
- Create: `apps/seumeiapp/src/presentation/stock-presenter.test.ts`
- Create: `apps/seumeiapp/app/workspace/stock/page.tsx`
- Create: `apps/seumeiapp/app/workspace/stock/[variantId]/page.tsx`
- Create: app-local client components and tests beside these routes

1. Write presenter tests for labels, currency-free quantities, health (`out | low | healthy`), permissions and timeline copy.
2. Build `/workspace/stock` with real active variants, honest empty state and links to catalog/detail.
3. Build `/workspace/stock/[variantId]` with balance/version, threshold editing, one movement operation at a time and append-only timeline.
4. Add visible conflict recovery that refreshes the balance before allowing a resubmission.
5. Test loading, empty, unavailable, forbidden, conflict and success states without fake persistence.
6. Commit: `feat(seumei): add stock workspace flow`.

### Task 7: Integrate navigation, manifest, route flows and ledger

**Files:**
- Modify: `apps/seumeiapp/src/manifest/manifest.ts`
- Modify: workspace navigation and `/docs` route-flow definitions
- Modify: `apps/seumeiapp/README.md`
- Modify: `apps/seumeiapp/docs/AGENT-START-HERE.md`
- Modify: `docs/seumei-migration-ledger.md`

1. Add Stock only after the complete route works; do not add future placeholders.
2. Document routes, permissions, data ownership, APIs, limitations and removal expectations for `/docs`.
3. Mark the ledger as assimilated only after browser and isolation evidence exists.
4. Run manifest, event and boundary tests affected by the change.
5. Commit: `docs(seumei): document stock assimilation`.

### Task 8: Prove the vertical slice and close it

1. Apply the additive migration to disposable PostgreSQL and seed two tenants with known cross-tenant IDs.
2. Run focused concurrency, idempotency, authorization and tenant A/B tests.
3. In a real browser verify desktop/mobile, keyboard/focus, console/overflow, entry, exit, reconciliation, conflict recovery, refresh and a new session.
4. Run consecutively: `pnpm --filter @matriz/app-seumei test`, `lint`, `typecheck`, `build`, `pnpm run test:smoke`, `pnpm run prisma:validate`, plus global schema/manifest/boundary gates required by the root package.
5. Review the diff for secrets, caches, generated output and unrelated changes.
6. Update the ledger and acceptance evidence with only observed results.
7. Commit: `test(seumei): prove stock tenant isolation`.
