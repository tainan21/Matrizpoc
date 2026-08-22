# Seumei Catalog and Route Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver real tenant-scoped category/product/variant authoring and a temporary authenticated `/docs` route-flow laboratory.

**Architecture:** Catalog domain, repository, services, presenters and UI remain app-local; persistence uses additive relational Seumei models and tenant predicates. Route flows are versioned app-local definitions plus a pure line parser and browser-local scratchpad with no authority.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma/PostgreSQL, Vitest, Testing Library, MatrizLib public exports and Playwright CLI.

**Spec:** `docs/superpowers/specs/2026-08-22-seumei-catalog-route-flows-design.md`

## Global Constraints

- Never accept browser `tenantId` as authority.
- Keep Seumei domain inside `apps/seumeiapp` and its owned Prisma schema.
- Use integer minor units for money and additive migrations only.
- Preserve honest empty, conflict, denied and unavailable states.
- Do not implement stock, store publication, email delivery or future placeholder pages.
- Follow strict red-green-refactor and validate UI repeatedly in a headed browser.

---

### Task 1: Record the active assimilation and persistence contract

**Files:** ledger, `prisma/schemas/seumei.prisma`, additive migration, schema contract test.

- [ ] Mark catalog `EM ASSIMILAÇÃO` with evidence and route-flow lab as temporary tooling.
- [ ] Write a failing schema test for category/product/variant models, tenant uniqueness and integer price.
- [ ] Run focused RED; add the minimal schema and SQL; validate GREEN and Prisma.
- [ ] Commit the independently valid data contract.

### Task 2: Build the pure catalog domain and policy

**Files:** `src/domain/catalog.ts`, tests, `src/domain/membership.ts` and policy tests.

- [ ] Write failing tests for normalization, cents, simple/configurable variant invariants and catalog role capabilities.
- [ ] Run RED; implement minimal pure functions and errors; run GREEN and refactor.
- [ ] Commit the domain vocabulary.

### Task 3: Persist catalog through a tenant-scoped repository

**Files:** domain repository interface, Prisma repository and contract tests.

- [ ] Write failing two-tenant tests that inspect exact predicates and transaction inputs.
- [ ] Run RED; implement list/get/create/update/category operations with tenant in every predicate.
- [ ] Run GREEN including known foreign IDs, SKU/slug/category conflicts and optimistic version conflict.
- [ ] Commit repository persistence.

### Task 4: Authorize catalog application services and HTTP routes

**Files:** catalog service/composition, API handlers and focused tests.

- [ ] Write failing tests for owner/admin mutations, member/viewer read-only behavior and foreign IDs.
- [ ] Run RED; compose active-company authority with repository operations; map explicit HTTP states.
- [ ] Run GREEN and existing access tests; commit authorized boundaries.

### Task 5: Build the route-flow model and `/docs`

**Files:** `src/domain/route-flow.ts`, canonical definitions, presenter, client/page, styles and tests.

- [ ] Write failing parser, presenter and component tests for valid steps, line errors, preview and Markdown export.
- [ ] Run RED; implement versioned flows and temporary scratchpad; run GREEN.
- [ ] Add authenticated workspace navigation and validate the page in headed desktop/mobile browser.
- [ ] Commit the route-flow laboratory.

### Task 6: Build catalog presenters and UI

**Files:** presenters, workspace list/editor routes, client components, shell navigation, manifest/docs and tests.

- [ ] Write failing presenter/component tests for empty, populated, read-only, error and conflict states.
- [ ] Run RED; implement list/create/detail/edit with accessible variant controls and honest feedback.
- [ ] Exercise create/read/update/refresh and read-only denial in headed browser after each milestone.
- [ ] Run GREEN and commit the complete UI flow.

### Task 7: Prove tenancy, persistence and release readiness

**Files:** negative integration tests, ledger, README, agent guide, spec verification record.

- [ ] Apply the additive migration to disposable PostgreSQL and seed tenants A/B.
- [ ] Exercise route flows in browser: login → company → workspace → products; members invite; `/docs`; refresh/new session; desktop/mobile; console/overflow.
- [ ] Run Seumei test, lint, typecheck and build; smoke; Prisma validate; all global gates required by schema/manifest changes.
- [ ] Inspect tracked/untracked files for secrets/caches/artifacts; update evidence and ledger; commit the verified state.
