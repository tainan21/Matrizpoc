# Seumei Company Provisioning and Onboarding Design

## Status

Approved in conversation on 2026-08-20. This specification defines the first
vertical assimilation slice after the permanent Seumei foundation.

## Outcome

An authenticated person can create or select a real Seumei company, resume its
persistent onboarding, complete the minimum operational setup and enter a
tenant-scoped workspace. Every read and mutation validates the authenticated
user's membership on the server. Browser-provided tenant IDs never grant
authority.

## Evidence and context

- `apps/seumeiapp` is the canonical Seumei application. Its public identity is
  `seumei`, package is `@matriz/app-seumei` and development port is `3008`.
- The current app authenticates through the Matriz Hub mock broker and derives
  its initial tenant snapshot server-side.
- `prisma/schemas/core.prisma` already owns global users, tenants,
  memberships, app registrations and shared session concepts.
- `prisma/schemas/seumei.prisma` is the Seumei persistence authority but does
  not yet distinguish company, establishment and store.
- The incoming reference separates `space`, `space-onboarding`, permissions,
  products, stock, store and orders. Its workspace selection and onboarding
  are persisted in local storage and mirrored to cookies, with mock fallback.
  Those behaviors are evidence, not runtime architecture to retain.
- Core and Seumei use distinct Prisma clients and may use distinct database
  connections. A single ACID transaction across both schemas cannot be
  assumed.

## Architectural decision

A Seumei company represents exactly one Matriz tenant in this slice. The Core
schema remains authoritative for identity, tenant and membership. The Seumei
schema remains authoritative for company and company onboarding.

Provisioning is coordinated by an app-local Seumei application service. It
uses only the public `@matriz/platform-db/core` and
`@matriz/platform-db/seumei` entry points through app-local repositories. It
does not import another app, change Matriz Hub or introduce a shared package.

This is preferred over reusing `Establishment` as company because the product
must preserve separate meanings for tenant, company, establishment and store.
It is preferred over a new Hub provisioning API because that contract has only
one consumer today and would conflict with the parallel Hub evolution.

## Scope

The slice includes:

1. authenticated actor resolution from the existing Hub session;
2. persistent Core user resolution by normalized email;
3. company and owner-membership provisioning;
4. listing only companies authorized for the current user;
5. active company selection with server validation;
6. persistent, resumable onboarding;
7. completion into a useful company workspace;
8. explicit empty, loading, unavailable, conflict, forbidden and unexpected
   error states;
9. negative authorization and tenant-isolation tests;
10. real browser validation at desktop and mobile viewport sizes.

The slice does not include products, stock, storefront publishing, orders,
customers, invitations, role management, native delivery or placeholder pages
for those capabilities.

## Domain model

### Company

`Company` is app-local Seumei domain data with these persisted properties:

- `id`: stable generated identifier;
- `tenantId`: unique Core tenant identifier;
- `name`: customer-facing company name;
- `slug`: stable workspace URL segment, globally unique within Seumei;
- `createdByUserId`: Core user identifier used for provisioning audit only;
- `status`: `PROVISIONING`, `ONBOARDING`, `ACTIVE` or `PROVISIONING_FAILED`;
- `operationType`: nullable until onboarding supplies it;
- `city` and `country`: minimum operational location;
- timestamps.

`tenantId` is unique because one company maps to one tenant in this slice.
Future establishments and stores belong to this company/tenant and are not
synonyms for it.

### Company onboarding

`CompanyOnboarding` belongs one-to-one to `Company` and duplicates `tenantId`
to make every query explicitly tenant-scoped. It stores:

- current step;
- schema version;
- last saved values needed to resume;
- completed step identifiers;
- started, updated and completed timestamps.

The existing tenant-scoped `SeumeiPreference` remains the persisted authority
for preferred currency. Onboarding holds the draft until completion copies the
validated value into that preference in the same Seumei transaction.

The steps are:

1. `identity`: confirm company name and slug;
2. `operation`: select operation type and location;
3. `preferences`: select currency and confirm minimum configuration;
4. `review`: review and complete.

Theme, module, layout and publication choices from the reference are deferred
until their corresponding vertical slices exist.

### Core ownership

Core continues to persist:

- the normalized global `User`;
- one `Tenant` per company;
- one `AppRegistration` enabling `seumei` for that tenant;
- the creator's `OWNER` membership for app `seumei`.

No cross-schema foreign key is introduced. Seumei stores the Core identifiers
as explicit external ownership references.

## Authenticated actor and active company

The request boundary first resolves the existing Hub session. It distinguishes
signed-out, authentication unavailable and authenticated states instead of
converting every failure to anonymous.

For authenticated requests, the app resolves the Core user by normalized email
and uses the persisted Core user ID for membership checks. The tenant list
embedded in the mock session is not the authority for Seumei company access.

Active company preference is stored in an HTTP-only, same-site cookie. The
cookie contains a company ID, never authority. On every read or mutation the
server verifies all of the following:

1. the company exists;
2. the company tenant matches the selected tenant;
3. the authenticated Core user has a `seumei` membership for that tenant;
4. the requested capability is allowed by the membership role;
5. provisioning/onboarding state allows the requested transition.

An altered or stale cookie therefore produces a forbidden or selection-needed
state and cannot expose another tenant.

## Provisioning workflow

Company creation accepts company fields and an idempotency key. It never
accepts a tenant ID.

1. Resolve the authenticated actor and Core user.
2. Normalize and validate name and slug.
3. Check idempotency and slug conflicts in Seumei.
4. In a Seumei transaction, create a `PROVISIONING` company, its onboarding
   record and minimum preference state using a server-generated tenant ID.
5. In a Core transaction, create the tenant, enable Seumei and create the
   creator's `OWNER` membership.
6. Mark the Seumei company `ONBOARDING` and select it for the current browser.

If the Core transaction fails, the application attempts to remove the
provisional Seumei aggregate. If compensation fails, the company remains
`PROVISIONING_FAILED`, is excluded from ordinary company lists and can be
retried by the same actor and idempotency key. Errors return a sanitized
correlation ID and never log cookies, tokens or sensitive onboarding values.

Repeated submissions with the same actor and idempotency key return the same
result. A slug owned by another provisioning request returns an honest conflict
state.

## Company listing and selection

The company list is constructed as an intersection, never a union:

1. query Core memberships for the authenticated user and app `seumei`;
2. collect only those tenant IDs;
3. query Seumei companies using those tenant IDs and visible statuses;
4. present those companies through an app-local view model.

Selection accepts a company ID because selection is user input. The server
loads it using the authenticated membership set before writing the active
company cookie. IDs known from another tenant are rejected.

## Onboarding workflow

Each onboarding request derives its tenant and company from the validated
active company context. Request bodies contain only editable fields and an
expected version for optimistic concurrency.

Saving a step validates its fields, persists progress and increments the
version in one Seumei transaction. A stale version returns conflict and the UI
offers to reload persisted progress.

Completion validates every required field and atomically updates the company,
onboarding and preference records in the Seumei schema. The company becomes
`ACTIVE` only in this transaction. Repeating completion is idempotent.

Refresh, process restart and a later login reconstruct the flow from Core and
Seumei persistence; no company or onboarding state depends on React memory or
local storage.

## Routes and presentation

- `/`: authenticated company entry. Shows authorized companies, creates a
  company, or continues the active company.
- `/onboarding`: validated active-company onboarding.
- `/workspace`: validated active-company workspace, available only after
  onboarding completion.
- app-local route handlers under `/api/companies`, `/api/company-selection`
  and `/api/onboarding` expose command/query boundaries to client components.

Server pages resolve the authoritative state and pass presenter-produced view
models to UI components. Client components own form interaction only. They do
not receive domain entities or tenant IDs.

The workspace contains real company identity, operation summary, onboarding
status and navigation back to company selection. It does not render empty
cards for unimplemented future modules.

## Failure states

- Missing Hub session: redirect to `/login`.
- Hub unreachable or malformed session: authentication unavailable state.
- Missing Core or Seumei database configuration: data unavailable state with
  actionable configuration guidance.
- No authorized companies: honest company creation state.
- Unknown or unauthorized company ID: forbidden without confirming whether the
  foreign company exists.
- Duplicate slug or stale onboarding version: conflict with recovery action.
- Partially failed provisioning: retryable provisioning state, hidden from
  unrelated users.
- Prisma/network failure: sanitized error response and correlation ID.

The app composition checks configuration before constructing Prisma clients.
It does not silently use the placeholder fallback URLs currently present in
the platform client as proof of availability.

## Persistence and migration

The Seumei schema change is additive. It creates company and onboarding tables,
enums, uniqueness constraints and tenant indexes. Existing establishment,
profile, order draft and preference rows are not deleted or rewritten.

A versioned SQL migration accompanies the schema. Applying it to a real
database remains an explicit operator action; this task does not run a
destructive migration or `db push` against an external environment.

Core already contains the required tables and constraints. No Core schema
change is planned unless implementation evidence proves a missing invariant.

## Application boundaries

App-local units are organized around behavior:

- company and onboarding domain types and validation;
- company provisioning, listing, selection and onboarding use cases;
- Core identity/membership repository adapter;
- Seumei company/onboarding repository adapter;
- authenticated request and active-company context resolver;
- presenters and view models;
- thin route handlers and UI components.

No `apps/<other-app>/src/**` or `apps/<other-app>/app/**` import is allowed.
No shared package receives Seumei domain logic. Matriz Admin, Matriz Control,
Matriz Hub and MatrizLib remain unchanged unless a verified blocker makes a
small public-contract change unavoidable.

## Test strategy

Development follows red-green-refactor. Tests cover:

- normalization and validation of company input;
- idempotent provisioning and compensation behavior;
- initial `OWNER` membership and Seumei app registration;
- company list intersection with Core memberships;
- company selection denial for a known foreign company ID;
- repository queries that always include tenant scope;
- resumable onboarding and optimistic conflict;
- completion requirements and idempotency;
- workspace denial before completion;
- explicit missing-configuration and infrastructure-unavailable states;
- presenters for empty, onboarding and active workspace states;
- route behavior without accepting tenant authority from request bodies;
- two users/tenants with mutually known IDs proving no cross-tenant read or
  mutation.

Browser validation covers login, empty state, company creation, selection,
onboarding resume, completion, workspace entry, refresh, later session,
forbidden access, desktop/mobile layout, keyboard focus, console errors and
horizontal overflow.

## Verification gates

At minimum:

```powershell
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei lint
pnpm --filter @matriz/app-seumei typecheck
pnpm --filter @matriz/app-seumei build
pnpm run test:smoke
pnpm run prisma:validate
```

Because the Seumei schema and migration are touched, relevant global build,
typecheck, lint and boundary checks are also run. Generated Prisma clients are
regenerated for validation but build outputs, caches, logs, screenshots and
environment files are not committed.

## Ledger classifications

| Capability | Classification | Priority | Destination | Assimilation state |
| --- | --- | --- | --- | --- |
| Company/space lifecycle | RECONSTRUIR | P0 | Seumei company domain | Designed |
| Tenant and owner membership | PRESERVAR CONTRATO | P0 | Core through app-local adapter | Designed |
| Active company selection | SUBSTITUIR | P0 | Validated server context | Designed |
| Resumable onboarding | ADAPTAR | P0 | Seumei persistent onboarding | Designed |
| Tenant authorization | CORRIGIR | P0 | Request context, repositories and tests | Designed |
| Company shell and member roles | ADAPTAR | P1 | Future Seumei slice | Deferred |
| Products and catalog | ADAPTAR | P1 | Future Seumei slice | Deferred |
| Stock and movements | ADAPTAR | P1 | Future Seumei slice | Deferred |
| Storefront and publishing | RECONSTRUIR | P1 | Future Seumei slice | Deferred |
| Orders | ADAPTAR | P1 | Future Seumei slice | Deferred |
| Customers and finance | AVALIAR | P2 | Future Seumei slices | Deferred |
| Store design | ADAPTAR | P2 | Seumei plus public MatrizLib exports | Deferred |
| Duplicate UI primitives | ELIMINAR DUPLICAÇÃO | P2 | Public MatrizLib exports | Deferred |
| Local-storage repositories | SUBSTITUIR | P0-P2 | Server repositories by slice | In progress |
| Demo analytics, kanban and layout builder | NÃO ASSIMILAR | P3 | None in current roadmap | Rejected |

## Risks and mitigations

- Cross-schema atomicity: use idempotency, ordered transactions, compensation
  and an explicit failed-provisioning state.
- Mock Hub sessions are process-memory based: company authority is rebuilt from
  persistent Core memberships; auth modernization remains a separate platform
  concern.
- No established multi-schema migration history exists: keep the change
  additive, provide SQL and do not apply it without a reproducible target.
- Parallel Hub work: base implementation on the latest clean split commit in an
  isolated worktree and avoid Hub edits.

## Completion criteria

The slice is complete only when every functional criterion has automated or
browser evidence, tenant A cannot access tenant B with known IDs, persistence
survives refresh and process restart, all required gates pass consecutively,
the ledger matches implementation, and the committed tree contains no
forbidden artifacts or reference-source changes.
