# AGENTS.md — Matriz Pay

## Objective

Own wallet accounts, immutable double-entry ledger, PSP integration and reconciliation.

## Boundaries

- Keep all financial rules inside this app.
- Core user references are opaque IDs; no cross-schema foreign keys.
- Store monetary values as integer minor units; never floats.
- Never edit balances or postings. Corrections are compensating transactions.
- Provider transport may be replaced; provider business decisions may not leak into shared packages.

## Validation

- `corepack pnpm --filter @matriz/app-matriz-pay test`
- `corepack pnpm --filter @matriz/app-matriz-pay lint`
- `corepack pnpm --filter @matriz/app-matriz-pay typecheck`
- `corepack pnpm --filter @matriz/app-matriz-pay build`
