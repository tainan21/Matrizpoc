# Seumei Essential Finance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver tenant-scoped operational finance with persisted order receipts, manual income/expense entries, cash metrics and auditable state transitions.

**Architecture:** Finance remains an app-local Seumei bounded context. Domain rules and aggregate math are pure, repository contracts require tenant scope, Prisma persists entries/events, and checkout creates its receipt inside the existing serializable transaction. Server pages and handlers resolve membership before calling application services; UI receives presenters rather than Prisma records.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.6, Vitest, Prisma 5/PostgreSQL, Matriz public design exports.

**Spec:** `docs/superpowers/specs/2026-08-24-seumei-essential-finance-design.md`

## Global Constraints

- Keep `appId: seumei`, package `@matriz/app-seumei` and port `3008` unchanged.
- The browser never supplies tenant authority.
- All money is a positive safe integer in cents; currency is `BRL` in this slice.
- OWNER and ADMIN receive `finance.read` and `finance.manage`; MEMBER and VIEWER receive neither.
- Order receipts are persisted atomically with checkout and are idempotent by tenant/order and tenant/idempotency key.
- Manual entries are cancelled, never deleted; order-derived entries cannot be mutated through finance commands.
- Fiscal, accounting, bank reconciliation, cost of goods, real payments, installments and recurrence remain outside scope.
- Domain code stays in `apps/seumeiapp`; no shared package is created.

---

### Task 1: Ledger classification, capability policy and finance domain

**Files:**
- Modify: `docs/seumei-migration-ledger.md`
- Modify: `apps/seumeiapp/src/domain/membership.ts`
- Modify: `apps/seumeiapp/src/domain/membership.test.ts`
- Create: `apps/seumeiapp/src/domain/finance.ts`
- Create: `apps/seumeiapp/src/domain/finance.test.ts`

**Interfaces:**
- Produces: `FinancialEntryStatus`, `FinancialEntryKind`, `FinancialEntryOrigin`, `FinancialEntryCategory`, `validateFinancialEntryDraft()`, `requireFinancialEntryTransition()` and `calculateFinanceOverview()`.
- Produces capabilities: `finance.read`, `finance.manage`.

- [ ] **Step 1: Update the ledger before domain code**

Change Financeiro essencial from `AVALIAR / P2 — ADIADO` to `RECONSTRUIR / P1 — EM ASSIMILAÇÃO`, recording the reference evidence, integer-cent model, persisted order origin, OWNER/ADMIN policy and negative tenant tests.

- [ ] **Step 2: Write failing capability tests**

```ts
it.each([
  ["OWNER", "finance.read", true],
  ["OWNER", "finance.manage", true],
  ["ADMIN", "finance.read", true],
  ["ADMIN", "finance.manage", true],
  ["MEMBER", "finance.read", false],
  ["VIEWER", "finance.read", false],
])("maps %s and %s to %s", (role, capability, allowed) => {
  expect(can(role, capability)).toBe(allowed)
})
```

- [ ] **Step 3: Write failing finance-domain tests**

Cover positive safe integer cents, due date before competence, paid status without `paidAt`, forbidden transitions, paid/open/cancelled aggregation, overdue boundary and cancelled-entry exclusion.

```ts
expect(() => validateFinancialEntryDraft({
  kind: "EXPENSE",
  origin: "MANUAL",
  category: "OPERATIONS",
  amountCents: 0,
  competenceDate: "2026-08-24",
  dueDate: "2026-08-24",
})).toThrow("Valor financeiro inválido")
```

- [ ] **Step 4: Verify RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/domain/membership.test.ts src/domain/finance.test.ts`

Expected: FAIL because the finance capabilities and finance module do not exist.

- [ ] **Step 5: Implement the minimal pure domain**

Implement explicit union types, validation, `OPEN -> PAID|CANCELLED`, and overview reduction with no database or presentation dependency.

- [ ] **Step 6: Verify GREEN and commit**

Run the focused command from Step 4, then:

```powershell
git add -- docs/seumei-migration-ledger.md apps/seumeiapp/src/domain/membership.ts apps/seumeiapp/src/domain/membership.test.ts apps/seumeiapp/src/domain/finance.ts apps/seumeiapp/src/domain/finance.test.ts
git commit -m "feat(seumei): define essential finance domain"
```

---

### Task 2: Additive Prisma schema, migration and tenant-scoped repository

**Files:**
- Modify: `prisma/schemas/seumei.prisma`
- Create: `prisma/migrations/seumei/202608240003_essential_finance/migration.sql`
- Create: `apps/seumeiapp/src/domain/repositories/finance-repository.ts`
- Create: `apps/seumeiapp/src/domain/finance-schema.contract.test.ts`
- Create: `apps/seumeiapp/src/infrastructure/finance.repository.ts`
- Create: `apps/seumeiapp/src/infrastructure/finance.repository.contract.test.ts`

**Interfaces:**
- Produces `FinanceRepository.listOverview(tenantId, filters, now)`, `findEntry(tenantId, entryId)`, `createManualEntry(tenantId, actorUserId, command)`, `transitionManualEntry(tenantId, entryId, command)` and `reconcileOrderReceipt(tenantId, orderId)`.
- Repository records expose ISO strings and integer cents; no Prisma entity crosses the boundary.

- [ ] **Step 1: Write failing schema-contract tests**

Assert models, enums, tenant composite identities, unique order relation, unique idempotency key, positive amount check in migration SQL and append-only event relation.

- [ ] **Step 2: Write failing repository-contract tests**

Use a fake `SeumeiPrismaClient` surface to prove every query carries `tenantId`, known tenant-B IDs return `null`, stale version throws `FinanceConflictError`, and order-derived entries reject transitions.

- [ ] **Step 3: Verify RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/domain/finance-schema.contract.test.ts src/infrastructure/finance.repository.contract.test.ts`

Expected: FAIL because the schema models and repository do not exist.

- [ ] **Step 4: Add the Prisma model and migration**

Create additive enums and tables equivalent to:

```prisma
model FinancialEntry {
  id              String @id @default(cuid())
  tenantId        String
  entryNumber     Int
  kind            FinancialEntryKind
  origin          FinancialEntryOrigin
  status          FinancialEntryStatus @default(OPEN)
  category        FinancialEntryCategory
  title           String
  description     String?
  amountCents     Int
  currency        String @default("BRL")
  competenceDate DateTime @db.Date
  dueDate         DateTime @db.Date
  paidAt          DateTime?
  orderId         String?
  idempotencyKey  String
  version         Int @default(1)
  createdByUserId String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  order           CommerceOrder? @relation(fields: [tenantId, orderId], references: [tenantId, id], onDelete: Restrict)
  events          FinancialEntryEvent[]
  @@unique([tenantId, id])
  @@unique([tenantId, entryNumber])
  @@unique([tenantId, orderId])
  @@unique([tenantId, idempotencyKey])
  @@index([tenantId, status, dueDate])
  @@index([tenantId, competenceDate])
  @@map("financial_entries")
}
```

Add PostgreSQL checks for `amount_cents > 0`, origin/order consistency and status/paid timestamp consistency. Add the reverse relation on `CommerceOrder`.

- [ ] **Step 5: Implement the repository minimally**

Use `findFirst({ where: { id, tenantId } })`, tenant-scoped aggregates/listing and `updateMany` with `{ id, tenantId, version, origin: "MANUAL", status: "OPEN" }`. Create the state event in the same transaction.

- [ ] **Step 6: Validate schema and tests**

Run:

```powershell
$env:SEUMEI_DATABASE_URL='postgresql://validate:validate@127.0.0.1:5432/seumei'
corepack pnpm exec prisma validate --schema prisma/schemas/seumei.prisma
corepack pnpm --filter @matriz/app-seumei test -- src/domain/finance-schema.contract.test.ts src/infrastructure/finance.repository.contract.test.ts
```

- [ ] **Step 7: Commit**

```powershell
git add -- prisma/schemas/seumei.prisma prisma/migrations/seumei/202608240003_essential_finance apps/seumeiapp/src/domain/repositories/finance-repository.ts apps/seumeiapp/src/domain/finance-schema.contract.test.ts apps/seumeiapp/src/infrastructure/finance.repository.ts apps/seumeiapp/src/infrastructure/finance.repository.contract.test.ts
git commit -m "feat(seumei): persist tenant scoped finance entries"
```

---

### Task 3: Integrate order receipts and demo reconciliation

**Files:**
- Modify: `apps/seumeiapp/src/infrastructure/commerce.repository.ts`
- Modify: `apps/seumeiapp/src/infrastructure/commerce.repository.contract.test.ts`
- Modify: `apps/seumeiapp/src/application/provision-demo-restaurant.ts`
- Modify: `apps/seumeiapp/src/application/provision-demo-restaurant.test.ts`

**Interfaces:**
- Consumes the finance schema and deterministic entry identity.
- Produces exactly one `PAID/ORDER/INCOME/SALES` entry for each `SIMULATED_APPROVED` order.

- [ ] **Step 1: Extend checkout contract tests first**

Assert checkout creates a finance entry and `CREATED` event with `amountCents === order.totalCents`, and replaying the same idempotency key performs no second financial create.

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/infrastructure/commerce.repository.contract.test.ts`

Expected: FAIL because checkout has no financial write.

- [ ] **Step 3: Add the atomic financial write**

After order creation and inside the existing serializable transaction, create the paid receipt with idempotency key `order-receipt:${created.id}` and event actor `public:demo-store`. Do not add a second transaction or calculate cost of goods.

- [ ] **Step 4: Add demo reconciliation RED/GREEN**

Extend provisioning tests so two runs preserve one receipt per existing demo order. Implement reconciliation through the finance repository contract rather than raw browser data.

- [ ] **Step 5: Run focused tests and commit**

```powershell
corepack pnpm --filter @matriz/app-seumei test -- src/infrastructure/commerce.repository.contract.test.ts src/application/provision-demo-restaurant.test.ts
git add -- apps/seumeiapp/src/infrastructure/commerce.repository.ts apps/seumeiapp/src/infrastructure/commerce.repository.contract.test.ts apps/seumeiapp/src/application/provision-demo-restaurant.ts apps/seumeiapp/src/application/provision-demo-restaurant.test.ts
git commit -m "feat(seumei): record order receipts atomically"
```

---

### Task 4: Application services, composition and HTTP authorization

**Files:**
- Create: `apps/seumeiapp/src/application/finance-service.ts`
- Create: `apps/seumeiapp/src/application/finance-service.test.ts`
- Modify: `apps/seumeiapp/src/application/composition.ts`
- Create: `apps/seumeiapp/src/http/finance-handlers.ts`
- Create: `apps/seumeiapp/src/http/finance-handlers.test.ts`
- Create: `apps/seumeiapp/app/api/finance/entries/route.ts`
- Create: `apps/seumeiapp/app/api/finance/entries/[entryId]/route.ts`
- Create: `apps/seumeiapp/app/api/finance/entries/[entryId]/pay/route.ts`
- Create: `apps/seumeiapp/app/api/finance/entries/[entryId]/cancel/route.ts`

**Interfaces:**
- Produces `readFinanceOverview`, `readFinanceEntry`, `createManualFinanceEntry`, `payManualFinanceEntry`, `cancelManualFinanceEntry`.
- HTTP errors map to 400 validation, 403 capability, 404 unknown/cross-tenant and 409 version conflict.

- [ ] **Step 1: Write failing application tests**

Prove OWNER/ADMIN success, MEMBER/VIEWER denial before repository calls, cents parsing from decimal form input, cross-tenant not-found, derived-entry mutation denial and stale version conflict.

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/application/finance-service.test.ts`

- [ ] **Step 3: Implement minimal services and composition**

Add the finance repository to `CompanyServicesResolution`. Parse `29,90`/`29.90` to `2990` through one tested domain helper; never accept a browser-provided tenant.

- [ ] **Step 4: Write HTTP tests before routes**

Test invalid payload, unavailable database, forbidden role, known tenant-B ID, successful create/pay/cancel and conflict response bodies.

- [ ] **Step 5: Implement handlers and thin route adapters**

Reuse the existing server actor/company context resolution. Route files only parse request/path data, call handlers and return their response.

- [ ] **Step 6: Verify and commit**

```powershell
corepack pnpm --filter @matriz/app-seumei test -- src/application/finance-service.test.ts src/http/finance-handlers.test.ts
git add -- apps/seumeiapp/src/application/finance-service.ts apps/seumeiapp/src/application/finance-service.test.ts apps/seumeiapp/src/application/composition.ts apps/seumeiapp/src/http/finance-handlers.ts apps/seumeiapp/src/http/finance-handlers.test.ts apps/seumeiapp/app/api/finance
git commit -m "feat(seumei): expose authorized finance commands"
```

---

### Task 5: Presenters, workspace UI and route flow

**Files:**
- Create: `apps/seumeiapp/src/ui/presenters/finance.presenter.ts`
- Create: `apps/seumeiapp/src/ui/presenters/finance.presenter.test.ts`
- Create: `apps/seumeiapp/src/ui/FinanceOverview.tsx`
- Create: `apps/seumeiapp/src/ui/FinanceOverview.test.tsx`
- Create: `apps/seumeiapp/src/ui/FinanceEntryDetail.tsx`
- Create: `apps/seumeiapp/app/workspace/finance/page.tsx`
- Create: `apps/seumeiapp/app/workspace/finance/entries/[entryId]/page.tsx`
- Modify: `apps/seumeiapp/src/ui/presenters/workspace-shell.presenter.ts`
- Modify: `apps/seumeiapp/src/ui/presenters/workspace-shell.presenter.test.ts`
- Modify: `apps/seumeiapp/src/ui/CompanyWorkspaceShell.tsx`
- Modify: `apps/seumeiapp/src/domain/route-flow.ts`
- Modify: `apps/seumeiapp/src/domain/route-flow.test.ts`

**Interfaces:**
- Presenter outputs formatted BRL labels, localized dates, status/category labels, action flags and empty-state copy.
- Server pages pass only presenter view models and action URLs to client components.

- [ ] **Step 1: Write presenter and shell tests first**

Test positive/negative BRL display, paid/open/overdue labels, OWNER/ADMIN finance navigation, MEMBER/VIEWER absence and canonical flow `/workspace/finance -> /workspace/finance/entries/[entryId]`.

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --filter @matriz/app-seumei test -- src/ui/presenters/finance.presenter.test.ts src/ui/presenters/workspace-shell.presenter.test.ts src/domain/route-flow.test.ts`

- [ ] **Step 3: Implement presenter and server pages**

Keep private pages dynamic and uncached. Missing entry renders the canonical not-found state; unavailable services render `SystemState`.

- [ ] **Step 4: Write component tests before components**

Test empty state, metrics, form validation feedback, pending disabled state, filters, detail timeline and action visibility.

- [ ] **Step 5: Implement responsive components**

Use existing Seumei typography, grid, field and button patterns. The primary viewport layout is a four-metric summary followed by manual entry and ledger; mobile collapses to a single column with no table-only interaction.

- [ ] **Step 6: Verify and commit**

```powershell
corepack pnpm --filter @matriz/app-seumei test -- src/ui/presenters/finance.presenter.test.ts src/ui/FinanceOverview.test.tsx src/ui/presenters/workspace-shell.presenter.test.ts src/domain/route-flow.test.ts
git add -- apps/seumeiapp/src/ui/presenters/finance.presenter.ts apps/seumeiapp/src/ui/presenters/finance.presenter.test.ts apps/seumeiapp/src/ui/FinanceOverview.tsx apps/seumeiapp/src/ui/FinanceOverview.test.tsx apps/seumeiapp/src/ui/FinanceEntryDetail.tsx apps/seumeiapp/app/workspace/finance apps/seumeiapp/src/ui/presenters/workspace-shell.presenter.ts apps/seumeiapp/src/ui/presenters/workspace-shell.presenter.test.ts apps/seumeiapp/src/ui/CompanyWorkspaceShell.tsx apps/seumeiapp/src/domain/route-flow.ts apps/seumeiapp/src/domain/route-flow.test.ts
git commit -m "feat(seumei): add essential finance workspace"
```

---

### Task 6: Browser acceptance, documentation and final gates

**Files:**
- Modify: `apps/seumeiapp/docs/AGENT-START-HERE.md`
- Modify: `docs/seumei-next-cycles-roadmap.md`
- Modify: `docs/seumei-migration-ledger.md`
- Create: `docs/audit/2026-08-24-seumei-essential-finance-acceptance.md`
- Create: `docs/audit/assets/2026-08-24-seumei-finance/*.png`

**Interfaces:**
- Produces reproducible acceptance evidence and an accurate next-slice recommendation.

- [ ] **Step 1: Apply the additive migration to disposable PostgreSQL**

Use only the isolated demo cluster. Verify existing companies/orders remain, provision twice, and confirm one receipt per order.

- [ ] **Step 2: Run real-browser route flows**

Validate:

1. global demo -> Galaxia -> finance overview;
2. existing orders appear as paid receipts;
3. create an open expense, refresh, pay it and inspect event history;
4. create and cancel another entry;
5. operator/MEMBER receives no finance navigation and direct route is denied;
6. known Sabor entry ID under Galaxia returns 404;
7. desktop 1440x1000 and mobile 390x844, keyboard focus, console and overflow.

- [ ] **Step 3: Capture screenshots and critique the result**

Capture overview, create form, detail timeline, paid state, empty/restricted state and mobile. Fix visible hierarchy, spacing, focus or overflow defects before acceptance.

- [ ] **Step 4: Update documentation truthfully**

Mark finance `ASSIMILADO` only after browser and gates pass. Record limits: simulated order receipts, no CMV, no real provider/fiscal/bank features.

- [ ] **Step 5: Run required gates twice over the same code commit**

```powershell
corepack pnpm --filter @matriz/app-seumei test
corepack pnpm --filter @matriz/app-seumei lint
corepack pnpm --filter @matriz/app-seumei typecheck
corepack pnpm --filter @matriz/app-seumei build
corepack pnpm run test:smoke
corepack pnpm run prisma:validate
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
```

Expected: two consecutive zero-exit rounds with no generated file committed.

- [ ] **Step 6: Commit acceptance evidence**

```powershell
git add -- apps/seumeiapp/docs/AGENT-START-HERE.md docs/seumei-next-cycles-roadmap.md docs/seumei-migration-ledger.md docs/audit/2026-08-24-seumei-essential-finance-acceptance.md docs/audit/assets/2026-08-24-seumei-finance
git commit -m "docs(seumei): record essential finance acceptance"
git status --short
```

Expected: clean worktree.

