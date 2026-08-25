# Seumei Store Identity and Publication Implementation Plan

> Execute incrementally with TDD. Keep all domain code app-local and commit after each green vertical hypothesis.

**Goal:** Deliver persistent store identity drafts, private preview, immutable publication snapshots and preset-aware public storefronts for authorized Seumei companies.

**Architecture:** Extend the existing one-per-tenant `StorePublication` aggregate with optimistic draft state and immutable `StorePublicationVersion` snapshots. A new app-local store-design boundary owns private authoring; the existing commerce boundary reads only the current published snapshot.

**Tech:** Next.js App Router, React, TypeScript, Prisma/PostgreSQL, Vitest, Testing Library, existing Matriz session/company context.

---

## Task 1 — Domain registry and capability policy

**Files:**

- Create: `apps/seumeiapp/src/domain/store-identity.ts`
- Create: `apps/seumeiapp/src/domain/store-identity.test.ts`
- Modify: `apps/seumeiapp/src/domain/membership.ts`
- Modify: `apps/seumeiapp/src/domain/membership.test.ts`

1. Write failing tests for the three preset IDs, semantic-token allowlist, content limits and OWNER/ADMIN capability matrix.
2. Implement the smallest validated preset registry and content rules.
3. Run focused tests and commit `feat(seumei): define store identity domain`.

## Task 2 — Additive schema and repository contract

**Files:**

- Modify: `prisma/schemas/seumei.prisma`
- Create: `prisma/migrations/seumei/202608240004_store_identity_publication/migration.sql`
- Create: `apps/seumeiapp/src/domain/repositories/store-design-repository.ts`
- Modify: `apps/seumeiapp/src/domain/commerce-schema.contract.test.ts`

1. Write failing schema-contract tests for draft columns, immutable version model, tenant uniqueness and public pointer.
2. Add schema and a non-destructive migration that backfills drafts from current publications.
3. Define tenant-scoped repository records/commands; no unscoped private method.
4. Validate/generate Prisma and commit `feat(seumei): persist store identity versions`.

## Task 3 — Repository behavior and commerce compatibility

**Files:**

- Create: `apps/seumeiapp/src/infrastructure/store-design.repository.ts`
- Create: `apps/seumeiapp/src/infrastructure/store-design.repository.contract.test.ts`
- Modify: `apps/seumeiapp/src/infrastructure/commerce.repository.ts`
- Modify: `apps/seumeiapp/src/domain/repositories/commerce-repository.ts`
- Modify: `apps/seumeiapp/src/infrastructure/commerce.repository.contract.test.ts`

1. Write failing contract tests for tenant-scoped draft initialization/read, optimistic save, immutable publish, unpublish, known cross-tenant IDs and conflict.
2. Implement transactions with aggregate version checks and snapshot numbering.
3. Make public store mapping use the current published snapshot and expose only validated preset/content.
4. Preserve demo bootstrap compatibility and checkout public visibility.
5. Run focused repository tests and commit `feat(seumei): version store publication drafts`.

## Task 4 — Authorized use cases and HTTP boundary

**Files:**

- Create: `apps/seumeiapp/src/application/store-design-service.ts`
- Create: `apps/seumeiapp/src/application/store-design-service.test.ts`
- Create: `apps/seumeiapp/src/http/store-design-handlers.ts`
- Create: `apps/seumeiapp/src/http/store-design-handlers.test.ts`
- Modify: `apps/seumeiapp/src/application/composition.ts`
- Modify: `apps/seumeiapp/src/http/next-boundary.ts`
- Create routes under `apps/seumeiapp/app/api/store/design/**`

1. Write failing tests for capability denial, input validation, tenant derivation, stale conflict and no `tenantId` body.
2. Implement read/save/publish/unpublish services and handler mappings.
3. Compose the repository and expose Next routes.
4. Run focused application/HTTP tests and commit `feat(seumei): expose store publication workflow`.

## Task 5 — Presenter, studio, preview and public storefront

**Files:**

- Create: `apps/seumeiapp/src/ui/presenters/store-design.presenter.ts`
- Create: `apps/seumeiapp/src/ui/presenters/store-design.presenter.test.ts`
- Create: `apps/seumeiapp/src/ui/StoreDesignStudio.tsx`
- Create: `apps/seumeiapp/src/ui/StoreDesignStudio.test.tsx`
- Modify: `apps/seumeiapp/src/ui/Storefront.tsx`
- Modify: `apps/seumeiapp/src/ui/presenters/commerce.presenter.ts`
- Create: `apps/seumeiapp/app/workspace/store/design/page.tsx`
- Create: `apps/seumeiapp/app/workspace/store/preview/page.tsx`
- Modify: workspace shell presenter/tests, route-flow definition/tests and `app/globals.css`

1. Write failing presenter/component tests for safe semantic tokens, draft label, pending/conflict feedback and published content.
2. Build a responsive split studio: focused controls beside a live storefront preview; presets are large visual choices, not a generic select.
3. Render private preview from the server-read draft and public storefront from the published snapshot.
4. Add capability-aware navigation and canonical route flow.
5. Run full app test/lint/typecheck/build and commit `feat(seumei): deliver store identity studio`.

## Task 6 — Demo brands, browser acceptance and closure

**Files:**

- Modify: `apps/seumeiapp/src/application/provision-demo-restaurant.ts`
- Modify: `apps/seumeiapp/scripts/provision-demo.ts`
- Update: ledger, roadmap and `apps/seumeiapp/docs/AGENT-START-HERE.md`
- Create: `docs/audit/2026-08-24-seumei-store-identity-acceptance.md`
- Create screenshots under `docs/audit/assets/2026-08-24-seumei-store-identity/`

1. Provision Galaxia as `COSMIC_DINER` and Sabor & Brasa as `BRAZILIAN_WARMTH`; repeat provisioning to prove idempotency.
2. Apply the additive migration only to the disposable PostgreSQL instance.
3. Validate browser route flow save → preview → publish → public refresh, plus unpublish/recover, restricted role and tenant A/B.
4. Capture and visually review desktop/mobile screenshots for both brands; check keyboard, focus, console and overflow.
5. Run two consecutive rounds: app test/lint/typecheck/build, smoke, six Prisma schemas and global lint/typecheck/build.
6. Update ledger/audit to reality, verify worktree hygiene and commit `docs(seumei): record store identity acceptance`.

## Stop conditions

- Do not add arbitrary CSS/font input to “complete” the editor.
- Do not change the public store before explicit publish.
- Do not expose preview by slug without membership.
- Do not silently republish during demo provisioning after a user-edited draft exists.
- After five correction rounds per failure group, preserve evidence and stop; after three repeated external blockers, request only indispensable authority.
