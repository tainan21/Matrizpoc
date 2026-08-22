# Seumei Catalog and Route Flows Laboratory Design

**Date:** 2026-08-22  
**Status:** Implemented and verified on 2026-08-22
**Scope:** `apps/seumeiapp`, additive Seumei schema/migration, and Seumei documentation

## Goal

Deliver the first operational-data slice of Seumei: real tenant-scoped categories, products and variants. Alongside it, add a temporary `/docs` laboratory that makes implemented route flows visible and lets the team sketch a flow as ordered route steps while the product is being assimilated.

## Evidence and assimilation decision

The read-only reference `modules/product/**` preserves useful behavior: workspace-scoped product/category lookup, normalized unique slugs, simple/configurable products, prices, status, read-only access and resumable editing. Its repositories are mock/browser-local, prices are floating-point values, products require an arbitrary first stock item, option groups are unstructured records, and store publication is mixed into catalog authoring.

- **ADAPTAR / P1:** categories, products, status, variants, normalized slugs and read-only roles.
- **SUBSTITUIR / P0:** local/mock persistence, client authority and floating-point money.
- **CORRIGIR / P1:** remove mandatory stock coupling and model variants relationally.
- **ADIAR / P1:** inventory, image upload, merchandising and public-store publication.

## Catalog architecture

Seumei owns three additive relational models:

- `ProductCategory`: tenant, name, slug, description and active state.
- `Product`: tenant, optional category, name, slug, description, status, optimistic version and audit timestamps.
- `ProductVariant`: tenant, product, name, optional SKU, integer `priceCents`, position and active state.

A simple product has exactly one default variant. A configurable product has one or more explicitly named variants. Application validation enforces this invariant transactionally. Slugs are unique inside a tenant; non-null SKU is unique inside a tenant. Categories referenced by a product must belong to the same tenant. Archive is non-destructive.

Every repository method receives the server-derived tenant explicitly and includes it in the database predicate. HTTP requests may contain category/product/variant identifiers, but never tenant authority. The active company context intersects the Seumei company with the authenticated Core membership before reads or writes.

Capabilities are app-local: every role with `workspace.read` may read the catalog; only `OWNER` and `ADMIN` receive `catalog.manage`. UI gates are explanatory only; application services repeat authorization.

## Catalog surface

- `GET/POST /api/catalog/categories`
- `GET/POST /api/catalog/products`
- `GET/PATCH /api/catalog/products/[productId]`
- `/workspace/products`: real list, filters, category summary and honest empty/unavailable states.
- `/workspace/products/new`: product, category selection and variant authoring.
- `/workspace/products/[productId]`: persisted detail/edit surface.

Conflicts return `409`, invalid input `400`, authentication `401`, authorization `403`, absent tenant-scoped records `404`, unavailable persistence `503`, and unexpected failures `500`. Cross-tenant identifiers use the same absent/forbidden boundary without disclosing ownership.

## Route flows laboratory

`/docs` is a temporary app-local development surface, not a business module and not part of Matriz Hub contracts. It lists versioned route-flow definitions for:

1. authentication, company selection/creation, onboarding and workspace;
2. member invitation and acceptance, explicitly noting the current manual-link delivery limitation;
3. category/product/variant authoring.

Each flow is an ordered set of route steps with a label, outcome and optional note. A pure parser accepts one step per line in the form `/route — outcome`; it validates relative application routes, reports line-specific errors and produces a preview plus copyable Markdown. Draft text lives only in component state/local browser storage and is labeled temporary; it grants no authority and never becomes business persistence. Canonical flows remain source-controlled TypeScript data consumed through a presenter.

The `/docs` page is authenticated and workspace-authorized, but is not tenant data. It is reachable from the workspace shell under a visibly temporary “Route flows” link and can be removed without schema or contract migrations.

## Testing and browser loop

Strict red-green-refactor cycles cover domain normalization, money, variant invariants, capability decisions, repository tenant predicates, transaction behavior, HTTP error mapping, presenters and route-flow parsing. Negative fixtures contain tenants A and B with known IDs and prove that neither reads nor mutations cross the boundary.

Playwright CLI is used throughout implementation: after each UI milestone, open the headed browser, snapshot, exercise the route flow, resnapshot after navigation and inspect console/overflow. Final browser evidence covers desktop and 390 × 844 mobile, keyboard focus, refresh, new session, role denial, conflicts and tenant A versus tenant B.

## Non-goals

- Inventory quantities or movements.
- Store publication, public catalog, featured order or badges.
- Image upload/storage.
- Destructive category/product deletion.
- A general diagramming product, collaboration backend or shared package.
- Email delivery without configured credentials.

## Success criteria

The slice is complete when categories and products with variants persist across refresh/session, only authorized companies are visible, cross-tenant known IDs fail, owner/admin mutations work, member/viewer mutations fail, conflicts are honest, `/docs` renders canonical flows and sketches valid flows, all required gates pass consecutively, browser evidence is recorded, the ledger is truthful and coherent commits leave a clean worktree.

## Browser verification record

- Headed browser completed `/login` → `/` → `/onboarding` → `/workspace`, then `/docs` and `/workspace/products`.
- A real category and configurable product with two priced SKUs persisted in disposable PostgreSQL and survived refresh/new browser session.
- Empty catalog, product creation, edit resumption and desktop/390 × 844 mobile layouts were inspected.
- Console errors before authentication were expected 401 responses from the Hub session/appearance endpoints plus a missing development favicon; no catalog request failed.

## Final gate record

- Seumei: 35 test files and 169 tests passed; scoped lint, typecheck and production build passed.
- Monorepo: 23 smoke files and 154 tests passed; global lint (37 tasks), typecheck (37 tasks) and build (10 tasks) passed.
- Prisma: all six schemas validated with their explicit disposable URLs.
- Migration: `202608220001_catalog/migration.sql` applied with `ON_ERROR_STOP` to an empty disposable PostgreSQL database and produced the three expected catalog tables.
- Repository/application tests prove tenant predicates for listing, known foreign product IDs and optimistic updates; browser persistence was verified across refresh and a fresh login session.
