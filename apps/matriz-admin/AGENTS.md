# AGENTS.md — Seumei

## Objective
Work safely inside Seumei as an app within the Matriz monorepo.

## Important context
Seumei is not the entire universe.

What you see inside `apps/seumei` is only the app-local slice.
There is additional context, tooling and shared infrastructure outside this app, including:

- shared auth
- shared design system
- shared environment/config handling
- shared events/contracts/external links
- workspace tooling
- monorepo-wide architectural rules

Do not assume everything relevant lives inside this folder.

## Read order
Before changing Seumei, read in this order:

1. `docs/architectural-laws.md`
2. `apps/seumei/docs/AGENT-START-HERE.md`
3. `apps/seumei/README.md`
4. `apps/seumei/src/manifest/manifest.ts`
5. `apps/seumei/src/bootstrap/index.ts`
6. `apps/seumei/public-contract.ts`

Then inspect only the relevant local layer:

- `src/domain/`
- `src/application/`
- `src/integration/`
- `src/mock/`
- `src/ui/`
- `app/`
- `desktop/` (native delivery only; domain remains under `src/`)

## What Seumei owns
Seumei owns establishment, restaurant, venue and operations-related business behavior.

Keep app-specific business rules inside Seumei unless there is a very strong reason not to.

## Cross-app rule
Do not import internals from other apps.

Forbidden:
- `apps/<other-app>/src/**`
- `apps/<other-app>/app/**`

Allowed cross-app integration must happen only through:
- `@matriz/integration-api-contracts`
- events
- gateways
- external links
- `public-contract.ts` when explicitly allowed

## Shared package rule
Do not move Seumei business logic into `packages/*` just because it looks reusable.

Only extract when:
- the code is truly shared by multiple apps
- it is not strong Seumei domain logic
- the public API is clear and stable

## Migration rule
If Seumei is being migrated from another repository:

- prefer a conservative migration
- make it work first
- preserve business behavior
- adapt borders second
- refactor shared pieces later

## Validation
Prefer scoped commands while working on Seumei:

- `pnpm --filter <seumei-package-name> dev`
- `pnpm --filter <seumei-package-name> lint`
- `pnpm --filter <seumei-package-name> typecheck`
- `pnpm --filter @matriz/app-seumei package:desktop`

## Output style
When changing Seumei, always state:

- what stayed local to Seumei
- what used shared infra
- what should not yet be extracted
- what future extraction candidates may exist
