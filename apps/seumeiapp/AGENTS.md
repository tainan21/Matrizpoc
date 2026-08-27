# AGENTS.md — Seumei

Seumei owns tenant-scoped company, onboarding, catalog, storefront, orders and stock behavior.
Never import another app's internals. UI consumes app-local view models. Keep tenant ID server-derived.

Read `docs/AGENT-START-HERE.md`, `README.md`, `src/manifest/manifest.ts`, `src/bootstrap/index.ts`.
Validate with `pnpm --filter @matriz/app-seumei test`, `typecheck`, `lint`, and `build`.
