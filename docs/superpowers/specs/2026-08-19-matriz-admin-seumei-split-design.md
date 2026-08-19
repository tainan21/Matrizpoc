# Matriz Admin and Seumei Product Split

## Decision

The current `apps/seumei` product becomes `apps/matriz-admin`. A new
`apps/seumeiapp` becomes the canonical Seumei product and keeps the stable
ecosystem identity `appId: "seumei"`.

The source placed at
`C:\Apps\matriz-infra-hub\apps\incoming\seumei-reference` is a migration
reference. It is not copied wholesale, imported at runtime, or committed by
this delivery. Features move from it into `apps/seumeiapp` one vertical slice
at a time.

## Why this split

The existing app already behaves like an operator-facing administrative tool:
it lists establishments and owners, observes operations, and now has a native
Windows delivery. Renaming it preserves useful work while freeing the Seumei
identity for the customer-facing multi-tenant commerce product.

Giving the new app `appId: "seumei"` avoids a temporary `seumeiapp` public
identity. The folder and package may use `seumeiapp` to distinguish the new
implementation during migration, but contracts, telemetry, events, tenant
configuration, and product navigation use `seumei`.

## Product ownership

### Matriz Admin

`apps/matriz-admin` is the operator console for the Matriz organization. It
will eventually aggregate customer and establishment visibility across
Seumei, Spot, Willdash, Contracts, and future products.

The first delivery preserves the current establishment and owner experience,
renames its web and Tauri surfaces, and changes its public identity to
`matriz-admin`. It does not gain speculative cross-product dashboards.

### Seumei

`apps/seumeiapp` is the customer product. Its long-term vertical flow is:

1. authenticate;
2. enter through Matriz Hub;
3. create or select a tenant/company;
4. complete company system onboarding;
5. enter the company workspace;
6. manage products and storefront;
7. publish the storefront;
8. operate orders and stock.

The first delivery implements only a permanent foundation: login, tenant-aware
session, protected home, Hub registration, and one real tenant-scoped
establishment read. It does not create placeholder product, order, stock, or
storefront screens.

## Data authority and tenancy

The Seumei PostgreSQL datasource and `prisma/schemas/seumei.prisma` remain the
single source of truth for Seumei business data. `apps/seumeiapp` owns that
domain and accesses it server-side through the existing
`@matriz/platform-db/seumei` repository entry point.

Every query in the initial slice requires a `tenantId`; repository calls never
fall back to an unscoped list. The home view may show an establishment count
and the first establishment for the authenticated tenant. Empty data is a
valid state. Missing database configuration is an explicit unavailable state,
not silently replaced with mock business data.

Matriz Admin shares the same business reality without sharing unrestricted
database authority. Its future reads and writes cross the Seumei public API or
gateway using versioned DTOs. During the first delivery, retained app-local
mocks may continue powering legacy Admin screens; no new duplicate persistence
is introduced.

## Identity and compatibility migration

The split is atomic at repository level:

- current folder: `apps/seumei` -> `apps/matriz-admin`;
- current package: `@matriz/app-seumei` -> `@matriz/app-matriz-admin`;
- current manifest and bootstrap: `seumei` -> `matriz-admin`;
- current Tauri product, binary, installer, storage namespace, and CI artifact:
  Seumei -> Matriz Admin;
- new folder: `apps/seumeiapp`;
- new package: `@matriz/app-seumei`;
- new public identity: `seumei`.

The new Seumei takes port `3008`; port `3007` remains reserved for MatrizLib.
Matriz Admin retains port `3002` so the
existing native Control workflow and local operational expectations have a
stable administrative endpoint. Hub, registry, ownership documentation,
visual audit tooling, deployment matrices, auth strategies, themes, and smoke
tests register both products explicitly.

Existing semantic contracts such as `seumei.establishment.selected`, the
Seumei Prisma schema, Seumei onboarding payload, and Contracts origin
`"seumei"` stay attached to the new Seumei identity. Matriz Admin does not
claim or rename those domain contracts merely because it contains transitional
legacy screens.

## Authentication and Hub entry

The new Seumei reuses the monorepo authentication flow and session mapping. It
does not reuse the reference project's empty NextAuth configuration. Login
produces or obtains a session carrying the stable Seumei app identity and a
tenant ID. A protected home redirects unauthenticated users to `/login`.

Matriz Hub imports the new Seumei manifest through its public contract and the
Matriz Admin manifest independently. Navigation into Seumei targets port 3008;
navigation into Matriz Admin targets port 3002.

## Reference-source migration

The reference project has useful conceptual boundaries: `space`,
`space-onboarding`, `tenant-modules`, `product`, `stock`, `orders`, `store`,
and design capabilities. Its localStorage repositories, mock identities,
duplicate UI primitives, standalone dependency versions, and direct framework
configuration are not migration targets.

Each future migration slice follows this sequence:

1. identify one user outcome and its source files;
2. define Seumei-local domain and repository contracts;
3. map persistence to tenant-scoped server repositories;
4. map presentation to MatrizLib components and view models;
5. add route, authorization, tests, and telemetry;
6. remove the need to consult that source slice.

The first recommended follow-up slice is company creation and onboarding,
because every product, storefront, order, and stock record depends on a stable
tenant/company context.

## Desktop and Control

The existing Tauri shell becomes Matriz Admin Desktop. Its installer is
independent and current-user scoped. Matriz Control updates its typed catalog,
native executable detection, build/install/start operations, tests, and labels
to operate Matriz Admin rather than the new Seumei.

The new Seumei remains web-only in this delivery. A Seumei-native shell is not
created until customer workflows justify a distinct desktop experience.

## Error handling

- Unauthenticated access redirects to login.
- A session without tenant context cannot execute the real data query.
- Database absence renders a compact unavailable state and preserves the
  ability to build without a live connection.
- An empty tenant renders zero establishments without leaking another tenant.
- Matriz Admin and Seumei cannot register the same app ID or port.
- Reference-source failures cannot affect builds because it is not part of the
  workspace dependency graph.

## Verification

The implementation is complete only when:

- app boundary, manifest, registry, auth, event, and public-contract smoke tests
  cover both identities;
- tenant repository tests prove scoped reads and reject missing tenant IDs;
- new Seumei login and protected-home tests pass;
- Matriz Admin web and Tauri tests pass under the new identity;
- Matriz Control resolves, builds, installs, and starts Matriz Admin by typed
  operations;
- scoped lint, typecheck, test, and build pass for both apps;
- global build, typecheck, lint, smoke, and Prisma validation pass;
- installers and caches remain ignored;
- no app imports another app's internal files.

## Explicit non-goals

- bulk-copying the incoming project;
- implementing company onboarding, products, storefront, orders, or stock in
  this first split;
- giving Matriz Admin direct ownership of Seumei persistence;
- introducing a shared package for strong Seumei domain logic;
- creating a second authentication or theme system;
- creating a new Seumei desktop installer now.
