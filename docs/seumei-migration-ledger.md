# Seumei migration ledger

## Permanent ownership

- `apps/seumeiapp`: login, tenant session, company, onboarding, catalog, stock, storefront, publishing, orders and customers.
- `prisma/schemas/seumei.prisma`: Seumei persistence source of truth.
- `apps/matriz-admin`: cross-product administration; no direct ownership of Seumei persistence.

## Current proof

The new Seumei authenticates through Matriz Hub, derives the active tenant server-side and reads a real tenant-scoped establishment through `@matriz/platform-db/seumei`. Browser input cannot select a tenant ID.

## Reference source

The externally supplied Seumei source remains read-only in `apps/incoming/seumei-reference` of the main checkout. Nothing is copied wholesale. Migrate one vertical slice at a time, preserving behavior and tests.

## Slice order

1. Company creation and onboarding.
2. Shell, membership and permissions.
3. Products and catalog.
4. Stock.
5. Storefront and publishing.
6. Orders.
7. Customers and finance.
8. Store design and layout.

Each slice must derive tenant context on the server, add contract tests, pass scoped gates and leave the reference source untouched.
