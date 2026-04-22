# @matriz/foundation-types

## Responsibility (L9)
Base types shared across the entire monorepo: brands, primitives, common utility types.

## Exposes
- Type-only exports (brands, ISO strings, tenant/app ID brands).

## Does NOT expose
- Any runtime logic.
- Any domain concept of apps (Gig, Contract, Establishment, Goal) — L12.

## May import
- Nothing. Foundation is the base layer (L4).

## Must NOT import
- Any other `@matriz/*` package.
- Anything from `apps/*`.
