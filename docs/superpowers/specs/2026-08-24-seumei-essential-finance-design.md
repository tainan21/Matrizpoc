# Seumei Essential Finance Design

Date: 2026-08-24

## Decision

Assimilate essential finance as an app-local Seumei bounded context. The first vertical slice combines order-derived receipts with manual income and expense entries, persists all monetary values in integer cents, and exposes a tenant-scoped operational cash view.

This is operational finance, not accounting. Tax, fiscal documents, bank reconciliation, chart of accounts, payment-provider settlement, installments, recurring entries and formal bookkeeping remain outside the slice.

## Evidence

The external reference under `apps/incoming/seumei-reference/modules/finance/**` preserves useful product knowledge:

- income and expense entries;
- manual entries alongside order-derived entries;
- forecast versus recognized money;
- categories, cash projection and monthly consolidation;
- derived records that cannot be edited as manual data.

The reference implementation is not reusable because it stores finance in browser-local repositories, uses floating-point money, derives records at read time, deletes manual entries, and estimates cost of goods from stock data that the canonical Seumei does not own.

The canonical Seumei already persists tenant-scoped orders with integer totals, idempotency keys, simulated payment state and atomic checkout. Finance will extend that transaction rather than rebuild commerce.

## User outcome

An authorized owner or administrator can:

1. open `/workspace/finance` and see realized cash, receivables, payables and the current competence result;
2. see one persisted receipt for every approved order without double counting;
3. register a manual income or expense with competence, due date and optional immediate payment;
4. open `/workspace/finance/entries/[entryId]` and inspect origin, dates, status and audit history;
5. mark an open manual entry as paid or cancel it without deleting history;
6. refresh or start a new session and observe the same data.

Members and viewers do not receive financial read access. Unknown or cross-tenant identifiers return the same not-found response.

## Domain model

### FinancialEntry

Each entry belongs explicitly to one tenant and contains:

- `id`, `tenantId` and immutable `entryNumber`;
- `kind`: `INCOME` or `EXPENSE`;
- `origin`: `ORDER` or `MANUAL`;
- `status`: `OPEN`, `PAID` or `CANCELLED`;
- `category`: `SALES`, `OPERATIONS`, `MARKETING`, `PEOPLE`, `TAXES` or `OTHER`;
- `title` and optional `description`;
- `amountCents` and `currency` (`BRL` in this slice);
- `competenceDate`, `dueDate` and optional `paidAt`;
- optional `orderId` for derived receipts;
- `idempotencyKey`, `version`, `createdByUserId`, `createdAt` and `updatedAt`.

Invariants:

- amount is a positive safe integer;
- due date cannot precede competence date;
- `PAID` requires `paidAt`; `OPEN` and `CANCELLED` do not carry `paidAt`;
- order origin requires `orderId`, `INCOME`, `SALES` and a unique order reference;
- manual origin never carries an order reference;
- order-derived entries cannot be edited, paid manually or cancelled through finance commands;
- cancellation is a state transition, never deletion;
- transitions are `OPEN -> PAID`, `OPEN -> CANCELLED`; terminal states do not transition in this slice.

### FinancialEntryEvent

An append-only event records `CREATED`, `PAID` or `CANCELLED`, the actor, optional note and timestamp. It provides the detail-page audit history without turning application logs into business persistence.

## Order integration

The existing simulated checkout writes the order-derived finance entry inside the same serializable Seumei transaction as customer, order, timeline and stock consumption.

Because `SIMULATED_APPROVED` represents approved payment in the demo contract, the receipt starts as `PAID`, uses the order total in cents, and records the checkout timestamp as competence, due and payment time.

The uniqueness constraints `(tenantId, orderId)` and `(tenantId, idempotencyKey)` prevent duplicate receipts. Replaying checkout returns the existing order and must not add a second finance entry.

No expense or cost-of-goods entry is derived because the current canonical ingredient model has quantity but no authoritative acquisition cost.

## Aggregates and dates

The overview derives values server-side from persisted entries:

- realized cash: paid income minus paid expense using `paidAt`;
- receivables: open income by due date;
- payables: open expense by due date;
- competence result: non-cancelled income minus expense for the selected competence month;
- overdue counts: open entries whose due date precedes the server date.

All date grouping uses the company timezone already captured by onboarding. Storage remains UTC/date-safe; the presenter owns localized labels.

## Authorization and tenancy

Add `finance.read` and `finance.manage` capabilities:

- OWNER and ADMIN: read and manage;
- MEMBER and VIEWER: no finance capability.

Every private page and route resolves the actor, active company and membership server-side. Repository methods require a `tenantId`; there is no unscoped financial lookup. The browser submits entry data and expected version, never tenant authority.

Financial responses and errors must not include data from another tenant. Caches, if later introduced, must include tenant and user capability context; this slice uses uncached private reads.

## Application and repository boundaries

App-local units:

- `src/domain/finance.ts`: value rules, transitions and aggregate calculations;
- `src/domain/repositories/finance-repository.ts`: tenant-scoped command/query contract;
- `src/application/finance-service.ts`: capability enforcement and use cases;
- `src/infrastructure/finance.repository.ts`: Prisma implementation and transactional order integration;
- `src/http/finance-handlers.ts`: HTTP mapping with honest forbidden, conflict, validation and not-found states;
- `src/ui/presenters/finance.presenter.ts`: localized view models only;
- `src/ui/FinanceOverview.tsx` and `FinanceEntryDetail.tsx`: accessible app-local UI.

No finance domain moves to a package and no other app imports Seumei internals.

## Routes

- `GET /api/finance/entries`: overview plus filtered entries;
- `POST /api/finance/entries`: create manual entry;
- `GET /api/finance/entries/[entryId]`: detail;
- `POST /api/finance/entries/[entryId]/pay`: pay an open manual entry;
- `POST /api/finance/entries/[entryId]/cancel`: cancel an open manual entry;
- `GET /workspace/finance`: operational overview and creation form;
- `GET /workspace/finance/entries/[entryId]`: detail and permitted actions.

The company shell links finance only when the presenter receives `finance.read` capability.

## UX and honest states

The overview uses the existing Seumei operational visual language and Matriz public components. It presents four primary metrics, a concise manual-entry form, filters and a chronological ledger. The detail route makes origin and audit history explicit.

Required states:

- empty ledger with a useful first action;
- unavailable database/configuration state;
- pending submit without artificial delay;
- field-level validation;
- optimistic-version conflict with reload action;
- forbidden and not-found without leakage;
- action success that survives refresh;
- mobile layout without horizontal overflow and usable keyboard focus.

## Data migration

The Prisma change is additive: new enums, `FinancialEntry`, `FinancialEntryEvent`, relations and composite constraints. Existing orders are not silently backfilled by the migration.

Demo provisioning explicitly reconciles existing demo orders into one derived receipt per order using the same idempotent application contract. A future production backfill requires a separately reviewed operational plan.

## Testing

TDD covers:

- integer money, date and transition invariants;
- aggregate math and overdue boundaries;
- role matrix;
- order receipt creation and checkout replay idempotency;
- manual creation, pay, cancellation and stale-version conflicts;
- attempts to mutate order-derived entries;
- two tenants using known entry and order IDs;
- repository contract and schema constraints;
- presenter and component states;
- real-browser order-to-finance flow, manual expense, refresh, restricted role, desktop and mobile.

The cycle finishes only after scoped tests, lint, typecheck, build, smoke, Prisma validation, boundary tests, browser evidence, ledger updates and a clean committed worktree.

## Non-goals

- real payment capture or refund;
- partial payment or installments;
- accounts or bank balances;
- recurring entries;
- attachments and receipts;
- cost-of-goods calculation;
- fiscal documents, tax calculation or bookkeeping;
- external financial integrations;
- cross-company consolidated finance.

