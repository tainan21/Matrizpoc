# Matriz Hub Alpha — Cycle 2 Implementation Plan

## Goal

Transform the existing structure and portfolio routes into one operational area without changing their real repositories, registries, contracts, or institutional ingestion.

## Scope

Only `apps/matriz-hub/**` and this plan. No other app internals, shared packages, root configuration, or Prisma schema changes.

## Architecture rules

- Server routes read existing registries/repositories and pass plain view models.
- UI components consume view models, never raw institutional/domain entities.
- Existing route URLs remain stable.
- Empty, partial and unavailable data stays explicit.
- No mock signal is introduced for visual completeness.

## Task 1 — Structure presenters

Create `src/ui/structure/structure-presenter.ts` and tests.

The presenter must build:

- project portfolio items with health, readiness, source, trust and counts;
- health summary and ordered project readings;
- registry application contracts with capability/event/integration counts;
- ecosystem relation edges from declared project capabilities;
- external-link items with source/target and persistence labels.

Tests must cover ordering, degraded/offline state mapping, missing signals, and relation counts.

## Task 2 — Shared structure workspace

Create app-local components:

- `OperationalPageHeader`
- `MetricStrip`
- `EntityList`
- `ContextInspector`
- `ProgressTrack`

Add structure CSS to the alpha environment stylesheet. Components must work at desktop, tablet and mobile breakpoints and retain visible focus states.

## Task 3 — Projects

Replace `/projects` with a presenter-driven portfolio workspace:

- selectable project list/grid;
- human source/trust language with technical terms secondary;
- readiness track and health state;
- next useful action;
- explicit snapshot origin.

Replace `/projects/[id]` with detail + inspector composition while preserving `notFound()` and the existing institutional registry.

## Task 4 — Health

Replace `/health` with:

- operational summary;
- attention queue ordered by actual readiness;
- project signal rows;
- visible stale/unknown state;
- links to project inspectors.

## Task 5 — Registry and catalog

Replace `/registry` with capability/event contract groups and `/catalog` with app-oriented inspectors. Preserve technical names as secondary labels and retain manifest truth.

## Task 6 — Ecosystem, links and architecture

Replace `/ecosystem` with a declared-relation map and `/external-links` with contextual link surfaces.

Create `/architecture` as a truthful view over existing app manifests and institutional relations. Add it to navigation only after the route exists. Label it as architecture map, never as runtime topology.

## Task 7 — Verification

Run scoped tests, typecheck and lint. Verify `/projects`, `/health`, `/registry`, `/catalog`, `/ecosystem`, `/external-links`, `/architecture` in browser at desktop and mobile sizes. Confirm no error overlay, no horizontal document overflow, correct active navigation and explicit data origins.

## Done criteria

- Structure routes read real sources through presenters.
- Each route belongs to the same environment but has a task-specific spatial composition.
- Existing URLs and links keep working.
- Architecture and persistence claims remain truthful.
- Scoped validation passes.
