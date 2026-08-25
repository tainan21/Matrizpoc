# Seumei Orders Customers and Demo Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a simulated public purchase into a persisted customer, order, timeline and atomic ingredient consumption visible in the authorized company workspace.

**Architecture:** A public store slug resolves the tenant server-side. Checkout submits only sellable variant, quantity, customer fields and idempotency key. A serializable Seumei transaction recalculates money, validates recipe/inventory, persists snapshots and decrements stock all-or-nothing. Workspace reads remain membership-authorized.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma/PostgreSQL, Vitest, Testing Library, Matriz public design packages.

**Spec:** `docs/superpowers/specs/2026-08-24-seumei-demo-federation-restaurant-commerce-design.md`

## Global Constraints

- Checkout is visibly simulated; no production payment, fiscal or delivery claim.
- The browser cannot choose tenant, price, totals, recipe version or stock effects.
- Customer identity is tenant-local and never becomes a Core user automatically.
- Failed checkout leaves customer, order and inventory unchanged.
- Order item/timeline/consumption records are immutable snapshots.

---

## Task 1: Add the additive commerce persistence contract

**Files:**
- Modify: `prisma/schemas/seumei.prisma`
- Create: `prisma/migrations/202608240002_add_seumei_demo_commerce/migration.sql`
- Create: `apps/seumeiapp/src/domain/commerce-schema.contract.test.ts`

- [ ] Write a failing schema-contract test for `StorePublication`, `Customer`, `Order`, `OrderItem`, `OrderTimelineEvent` and `OrderStockConsumption`.
- [ ] Assert tenant-scoped customer contact keys, order number/idempotency uniqueness, immutable snapshot columns and useful tenant/status/time indexes.
- [ ] Add lifecycle/payment/channel/fulfillment enums and additive SQL constraints for non-negative money and positive quantity.
- [ ] Generate the existing Seumei client, inspect migration safety, run schema tests and Prisma validation.
- [ ] Commit: `feat(seumei): add demo commerce schema`.

## Task 2: Define checkout and order lifecycle rules

**Files:**
- Create: `apps/seumeiapp/src/domain/commerce.ts`
- Create: `apps/seumeiapp/src/domain/commerce.test.ts`
- Modify: `apps/seumeiapp/src/domain/membership.ts`
- Modify: `apps/seumeiapp/src/domain/membership.test.ts`

- [ ] Write failing literal-fixture tests for customer normalization, safe quantities/money, order totals and idempotency command identity.
- [ ] Write failing transition-table tests for `PLACED -> CONFIRMED -> PREPARING -> READY -> COMPLETED` and permitted cancellation; reject skipped/backward transitions.
- [ ] Add `orders.read/manage` and `customers.read`; MEMBER may advance operations, VIEWER is read-only, OWNER/ADMIN retain management.
- [ ] Implement pure rules and run focused tests.
- [ ] Commit: `feat(seumei): define checkout and order rules`.

## Task 3: Implement the serializable checkout transaction

**Files:**
- Create: `apps/seumeiapp/src/domain/repositories/commerce-repository.ts`
- Create: `apps/seumeiapp/src/infrastructure/commerce.repository.ts`
- Create: `apps/seumeiapp/src/infrastructure/commerce.repository.test.ts`

- [ ] Write failing integration tests for successful purchase, identical replay, mismatched replay, unpublished product, missing recipe and insufficient stock.
- [ ] Prove foreign variant/customer/order IDs are indistinguishable from missing IDs.
- [ ] Prove two concurrent purchases cannot overspend the same ingredient and the loser leaves no partial customer/order/movement.
- [ ] Implement one serializable transaction with bounded retry for serialization conflicts, server price calculation and immutable snapshots.
- [ ] Upsert a tenant customer only from normalized contact evidence; link every ingredient movement through `OrderStockConsumption`.
- [ ] Run focused integration tests.
- [ ] Commit: `feat(seumei): persist atomic simulated checkout`.

## Task 4: Expose public store and workspace commerce services

**Files:**
- Create: `apps/seumeiapp/src/application/commerce-service.ts`
- Create: `apps/seumeiapp/src/application/commerce-service.test.ts`
- Create: `apps/seumeiapp/src/http/commerce-handlers.ts`
- Create: `apps/seumeiapp/src/http/commerce-handlers.test.ts`
- Create: `apps/seumeiapp/app/api/public/v1/stores/[storeSlug]/route.ts`
- Create: `apps/seumeiapp/app/api/public/v1/stores/[storeSlug]/checkout/route.ts`
- Create: `apps/seumeiapp/app/api/orders/route.ts`
- Create: `apps/seumeiapp/app/api/orders/[orderId]/route.ts`
- Create: `apps/seumeiapp/app/api/customers/route.ts`
- Create: `apps/seumeiapp/app/api/customers/[customerId]/route.ts`

- [ ] Write failing tests for published store reads, checkout validation/idempotency/conflict, workspace authorization and tenant A/B IDs.
- [ ] Reject request-provided tenant/price/total/recipe/stock authority.
- [ ] Implement stable public and authenticated view contracts with no raw Prisma records or sensitive customer fields in list payloads.
- [ ] Add private/no-store caching for workspace data and safe public cache variation by store publication version.
- [ ] Run focused tests.
- [ ] Commit: `feat(seumei): expose store order customer contracts`.

## Task 5: Build the real store and checkout route flow

**Files:**
- Create: `apps/seumeiapp/src/ui/presenters/store.presenter.ts`
- Create: `apps/seumeiapp/src/ui/presenters/store.presenter.test.ts`
- Create: `apps/seumeiapp/src/ui/Storefront.tsx`
- Create: `apps/seumeiapp/src/ui/SimulatedCheckout.tsx`
- Create: `apps/seumeiapp/app/store/[storeSlug]/page.tsx`
- Create: `apps/seumeiapp/app/store/[storeSlug]/checkout/page.tsx`
- Create: `apps/seumeiapp/app/store/[storeSlug]/checkout/success/page.tsx`

- [ ] Write failing presenter/component tests for available products, sold-out state, totals, customer validation, pending/conflict/insufficient/retry and simulation labels.
- [ ] Implement store, checkout and persisted receipt using real product assets and server-derived price/availability.
- [ ] Use an idempotency key scoped to one checkout attempt and preserve it across a retry/refresh without using localStorage as business persistence.
- [ ] Verify keyboard/focus, mobile layout and honest errors.
- [ ] Commit: `feat(seumei): add simulated restaurant storefront`.

## Task 6: Build operations, orders and customer history

**Files:**
- Create: `apps/seumeiapp/src/ui/presenters/commerce.presenter.ts`
- Create: `apps/seumeiapp/src/ui/presenters/commerce.presenter.test.ts`
- Modify: `apps/seumeiapp/src/ui/CompanyWorkspace.tsx`
- Create: `apps/seumeiapp/app/workspace/orders/page.tsx`
- Create: `apps/seumeiapp/app/workspace/orders/[orderId]/page.tsx`
- Create: `apps/seumeiapp/app/workspace/customers/page.tsx`
- Create: `apps/seumeiapp/app/workspace/customers/[customerId]/page.tsx`
- Modify: `apps/seumeiapp/src/ui/CompanyWorkspaceShell.tsx`
- Modify: `apps/seumeiapp/app/globals.css`

- [ ] Write failing presenter/UI tests for orders today, ticket average, pending count, low stock, order timeline/consumption and customer order history.
- [ ] Implement `operations-v1` from persisted summaries; never fabricate live connectors.
- [ ] Add state transition controls according to capability and optimistic version.
- [ ] Add navigation only when every route has real reads, loading, empty, unavailable and forbidden states.
- [ ] Run UI tests, lint, typecheck and build.
- [ ] Commit: `feat(seumei): add order operations and customers`.

## Task 7: Seed the demo purchase and prove the end-to-end effect

**Files:**
- Modify: `apps/seumeiapp/src/application/provision-demo-federation.ts`
- Modify: `apps/seumeiapp/src/application/provision-demo-federation.test.ts`
- Modify: `apps/seumeiapp/src/domain/route-flow.ts`
- Modify: `docs/seumei-migration-ledger.md`
- Create: `docs/audit/2026-08-24-seumei-restaurant-commerce-acceptance.md`

- [ ] Publish Galaxia Burger and create one deterministic simulated order through the same checkout service, not direct seed inserts.
- [ ] Prove the order, customer, timeline and ingredient balance changes persist after refresh/new session.
- [ ] Verify the restricted operator sees Galaxia commerce but never Sabor & Brasa IDs, BI, customers or orders.
- [ ] Capture the complete route flow in desktop/mobile and compare same-viewport screenshots with the three approved visual references.
- [ ] Fix onboarding pending/error recovery and verify the prior catalog empty-state regression.
- [ ] Run every scoped/global gate twice consecutively on the committed candidate.
- [ ] Commit: `test(seumei): prove restaurant commerce route flow`.

## Task 8: Score multi-tenancy and close the cycle

**Files:**
- Create: `docs/audit/2026-08-24-seumei-multitenancy-scorecard.md`
- Create: `docs/audit/Seumei-Restaurant-Demo-Acceptance.docx`
- Create: `docs/audit/Seumei-Restaurant-Demo-Acceptance.pdf`
- Modify: `docs/seumei-next-cycles-roadmap.md`
- Modify: `apps/seumeiapp/README.md`
- Modify: `apps/seumeiapp/docs/AGENT-START-HERE.md`

- [ ] Score every weighted control as PASS/PARTIAL/FAIL with direct test, code, migration or browser evidence.
- [ ] Separate application-level isolation from production session exchange, database role/RLS and observability gaps.
- [ ] Render DOCX/PDF, inspect every page visually and include representative screenshots without secrets.
- [ ] Confirm no installer is generated because Seumei remains web-first.
- [ ] Review Git for secrets, caches, generated clients, unrelated changes and a clean worktree.
- [ ] Commit: `docs(seumei): close restaurant demo acceptance`.

