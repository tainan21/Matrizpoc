# Seumei Demo Federation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provision two safe demo companies and expose an authenticated MyHub portfolio that contains only the actor's authorized Seumei companies.

**Architecture:** Core persists global users, tenants, memberships and app registrations. Seumei persists each company projection and calculates portfolio summaries. MyHub consumes a versioned HTTP contract through an app-local gateway; it never imports Seumei internals or reads its database.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma/PostgreSQL, Vitest, Testing Library, Matriz public design packages.

**Spec:** `docs/superpowers/specs/2026-08-24-seumei-demo-federation-restaurant-commerce-design.md`

## Global Constraints

- Demo presentation never grants access; ordinary app-scoped memberships remain authoritative.
- Provisioning is explicit, idempotent and guarded by `MATRIZ_DEMO_PROVISIONING=true`.
- The browser never submits `tenantId`, role or portfolio totals.
- MyHub may consume only `GET /api/public/v1/portfolio` and a neutral V1 DTO.
- Do not claim production SSO while the Hub session remains the documented mock adapter.

---

## Task 1: Lock the portfolio contract and demo identities

**Files:**
- Create: `packages/integration/api-contracts/src/seumei-portfolio-v1.ts`
- Modify: `packages/integration/api-contracts/src/index.ts`
- Create: `packages/integration/api-contracts/src/seumei-portfolio-v1.test.ts`
- Create: `apps/seumeiapp/src/domain/demo-federation.ts`
- Create: `apps/seumeiapp/src/domain/demo-federation.test.ts`

- [ ] Write failing literal-fixture tests for the V1 parser and totals; reject unknown roles, negative metrics and malformed workspace URLs.
- [ ] Write failing tests for the fixed demo identity set and refusal when demo mode is disabled.
- [ ] Run focused tests and observe the missing exports/behavior fail.
- [ ] Implement the minimal neutral DTO/parser and app-local demo definitions.
- [ ] Run focused tests and `pnpm --filter @matriz/integration-api-contracts typecheck`.
- [ ] Commit: `feat(contracts): add Seumei portfolio v1`.

## Task 2: Build the explicit idempotent provisioner

**Files:**
- Create: `apps/seumeiapp/src/application/provision-demo-federation.ts`
- Create: `apps/seumeiapp/src/application/provision-demo-federation.test.ts`
- Modify: `apps/seumeiapp/src/domain/repositories/core-access-repository.ts`
- Modify: `apps/seumeiapp/src/infrastructure/core-access.repository.ts`
- Modify: `apps/seumeiapp/src/domain/repositories/company-repository.ts`
- Modify: `apps/seumeiapp/src/infrastructure/company.repository.ts`
- Create: `apps/seumeiapp/scripts/provision-demo.ts`
- Modify: `apps/seumeiapp/package.json`

- [ ] Write failing service tests for first run, identical rerun, non-demo slug collision, global owner memberships for both tenants and restricted operator membership only for Galaxia Burger.
- [ ] Prove the expected rows use ordinary Core `User`, `Tenant`, `Membership`, `AppRegistration` and Seumei `Company` contracts.
- [ ] Add only tenant-scoped/upsert primitives needed by the provisioner; every collision check must distinguish deterministic demo identity from unrelated data.
- [ ] Implement `demo:provision` as an explicit command; do not call it from bootstrap or request paths.
- [ ] Run focused tests twice against controlled adapters and confirm stable counts.
- [ ] Commit: `feat(seumei): provision safe restaurant demos`.

## Task 3: Calculate a server-authorized portfolio

**Files:**
- Create: `apps/seumeiapp/src/domain/repositories/portfolio-repository.ts`
- Create: `apps/seumeiapp/src/application/read-portfolio.ts`
- Create: `apps/seumeiapp/src/application/read-portfolio.test.ts`
- Create: `apps/seumeiapp/src/infrastructure/portfolio.repository.ts`
- Create: `apps/seumeiapp/src/infrastructure/portfolio.repository.test.ts`
- Modify: `apps/seumeiapp/src/application/composition.ts`

- [ ] Write failing tests proving the global demo actor sees exactly two authorized companies and the operator sees only Galaxia Burger.
- [ ] Add tenant-A/B known-ID tests proving summaries are aggregated only from membership-derived tenant IDs.
- [ ] Define `listSummaries(authorizedTenantIds)` so an empty set returns empty without a global query.
- [ ] Implement totals from persisted company/order/stock facts, returning zero honestly before commerce data exists.
- [ ] Run focused repository/service tests.
- [ ] Commit: `feat(seumei): read authorized company portfolio`.

## Task 4: Publish the versioned API

**Files:**
- Create: `apps/seumeiapp/src/http/portfolio-handler.ts`
- Create: `apps/seumeiapp/src/http/portfolio-handler.test.ts`
- Create: `apps/seumeiapp/app/api/public/v1/portfolio/route.ts`

- [ ] Write failing tests for signed-out, unavailable database, empty portfolio, global actor and restricted actor.
- [ ] Prove a supplied tenant query/header cannot widen access.
- [ ] Implement actor resolution and return only the public V1 DTO with `Cache-Control: private, no-store`.
- [ ] Run handler tests and the Seumei route build.
- [ ] Commit: `feat(seumei): expose authorized portfolio api`.

## Task 5: Add the MyHub gateway and Federation surface

**Files:**
- Create: `apps/matriz-hub/src/domains/portfolio/application/load-seumei-portfolio.ts`
- Create: `apps/matriz-hub/src/domains/portfolio/application/load-seumei-portfolio.test.ts`
- Create: `apps/matriz-hub/src/domains/portfolio/presentation/portfolio-presenter.ts`
- Create: `apps/matriz-hub/src/domains/portfolio/presentation/portfolio-presenter.test.ts`
- Create: `apps/matriz-hub/src/domains/portfolio/presentation/FederationPortfolio.tsx`
- Modify: `apps/matriz-hub/app/page.tsx`
- Modify: `apps/matriz-hub/app/globals.css`

- [ ] Write failing gateway tests for server-side session forwarding, 401, unavailable service, malformed DTO and actor-specific no-store behavior.
- [ ] Write presenter tests for totals, company cards, roles, empty/unavailable states and safe Seumei entry URLs.
- [ ] Implement the app-local gateway with configured Seumei public origin and no direct database/internal import.
- [ ] Implement `federation-v1` using existing Matriz tokens, clear demo/simulation labels, keyboard navigation and responsive cards.
- [ ] Keep the existing environment overview reachable only if it remains an intentional authenticated secondary surface; do not duplicate portfolio authority.
- [ ] Run Hub tests, lint, typecheck and build.
- [ ] Commit: `feat(hub): add authorized federation portfolio`.

## Task 6: Prove cross-app isolation and document the slice

**Files:**
- Modify: `docs/seumei-migration-ledger.md`
- Modify: `apps/seumeiapp/README.md`
- Modify: `apps/seumeiapp/docs/AGENT-START-HERE.md`
- Create: `docs/audit/2026-08-24-seumei-demo-federation-acceptance.md`

- [ ] Run the provisioner twice against disposable PostgreSQL and record stable row counts.
- [ ] In the real browser verify both demo profiles, refresh/new session, direct company entry, desktop/mobile, keyboard, console and overflow.
- [ ] Capture MyHub global and restricted portfolio states with no unauthorized company names/IDs in HTML or network payloads.
- [ ] Run contract, boundary, Seumei, Hub, smoke and Prisma gates.
- [ ] Update the ledger only with observed evidence and name the mock-session production gap.
- [ ] Commit: `test(seumei): prove demo federation isolation`.

