# Seumei Real Multitenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every authenticated and public Seumei database operation fail closed under PostgreSQL RLS and prove Tenant A cannot observe or mutate Tenant B through application routes, repository calls, pooled connections, or forged input.

**Architecture:** Use the durable OIDC BFF session as the only server-side authorization authority, propagate one active `AuthorizationContext`, and execute tenant-owned Prisma work through a typed transaction executor that always calls `SET LOCAL matriz.tenant_id`. Replace cross-tenant product queries with active-tenant behavior and introduce a minimal public store-route projection readable by a dedicated restricted role before entering a tenant transaction.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.6, Prisma 5.20, PostgreSQL 17 RLS, Vitest 2, Matriz Identity OIDC BFF.

**Spec:** `docs/MATRIZ-DATA-PLATFORM-COCKPIT.md`

## Global Constraints

- Work only in `apps/seumeiapp`, `packages/platform/db`, `packages/platform/auth` when an exported server contract is required, `prisma/seumei`, the fixed infrastructure role/env declarations, and directly related docs/tests.
- Never import `apps/<other-app>/src/**` or `apps/<other-app>/app/**`.
- Core remains the only authority for users, tenants, memberships and app grants; Seumei accesses Core through OIDC/public contracts or its existing Identity gateway.
- `tenantId` is taken from a validated server session or a trusted public projection, never request body/query/header authority.
- Every tenant-owned database operation runs inside a transaction with `SET LOCAL matriz.tenant_id` and uses only that transaction client.
- Runtime and public resolver roles remain `NOINHERIT`, `NOREPLICATION`, and `NOBYPASSRLS`.
- Public resolution exposes only `storeSlug`, `tenantId`, `publicationId`, `canonicalHost`, and publication status.
- Tests that claim isolation must use PostgreSQL 17 and restricted roles, not mocked Prisma clients.
- Preserve the app-local domain; do not create a shared package for Seumei business rules.
- Run scoped Seumei validation after each task and global boundary/infrastructure validation only when shared packages, migrations, roles, or environment contracts change.

---

## File Structure

- Modify: `packages/platform/db/src/tenant-context.ts` — typed generic tenant executor contract.
- Modify: `packages/platform/db/src/seumei.ts` — exports the Seumei transaction client type and restricted public client factory.
- Modify: `packages/platform/db/package.json` — focused package test command.
- Create: `packages/platform/db/vitest.config.ts` — Node test configuration for platform-db unit tests.
- Create: `apps/seumeiapp/src/infrastructure/tenant-executor.ts` — Seumei composition adapter around the generic executor.
- Create: `apps/seumeiapp/src/infrastructure/public-store-route.repository.ts` — restricted slug-to-tenant resolver.
- Modify: `apps/seumeiapp/src/auth/server-session.ts` — durable OIDC resolution and server-built actor/context.
- Modify: `apps/seumeiapp/src/auth/server-page-context.ts` and `apps/seumeiapp/src/http/next-boundary.ts` — propagate the active authorization context.
- Modify: `apps/seumeiapp/src/types/session-actor.ts` — immutable OIDC authorization fields.
- Modify: `apps/seumeiapp/src/application/composition.ts` — inject tenant executor and public resolver separately.
- Modify: `apps/seumeiapp/src/domain/repositories/*.ts` — active-tenant repository interfaces.
- Modify: `apps/seumeiapp/src/infrastructure/*.repository.ts` — enforce tenant transaction boundary.
- Modify: affected `apps/seumeiapp/src/application/*.ts`, `src/http/*.ts`, and route/page tests — remove cross-tenant product authority.
- Modify: `prisma/seumei/schema.prisma` — public store route projection.
- Create: `prisma/seumei/migrations/202609010001_public_store_routes_and_runtime_rls/migration.sql` — projection, RLS verification and restricted grants.
- Modify: `apps/matriz-control/desktop/infrastructure-helper.ps1` — provision public resolver role.
- Modify: `apps/matriz-control/desktop/local-environment-helper.ps1` — inject `SEUMEI_PUBLIC_DATABASE_URL` without displaying it.
- Modify: `apps/seumeiapp/infrastructure.json` — declare the new local environment reference.
- Create: `apps/seumeiapp/src/infrastructure/seumei-postgres.integration.test.ts` — live restricted-role isolation suite.
- Modify: `apps/seumeiapp/README.md` and `docs/MATRIZ-DATA-PLATFORM-COCKPIT.md` — verified operating contract.

### Task 1: Make durable OIDC context the only server authority

**Files:**

- Modify: `apps/seumeiapp/src/types/session-actor.ts`
- Modify: `apps/seumeiapp/src/auth/server-session.ts`
- Modify: `apps/seumeiapp/src/auth/server-session.test.ts`
- Modify: `apps/seumeiapp/src/auth/server-page-context.ts`
- Modify: `apps/seumeiapp/src/http/next-boundary.ts`
- Modify: `apps/seumeiapp/app/api/invitations/accept/route.ts`
- Modify: `apps/seumeiapp/app/invite/[token]/page.tsx`

**Interfaces:**

- Consumes: `resolveOidcServerSessionDurable(request, oidcConfig())` and `OidcAuthorizationContext` from `@matriz/platform-auth/server`.
- Produces: `resolveSeumeiSession(request: Request): Promise<SeumeiSessionResolution>` where authenticated resolution includes one immutable `SessionActor` bound to app `seumei` and its active tenant.

- [ ] **Step 1: Write failing durable-session tests**

Replace cookie-to-Hub mock tests with dependency-injected OIDC resolver tests:

```ts
const context = {
  userId: "user-a",
  tenantId: "tenant-a",
  appId: "seumei",
  membershipId: "membership-a",
  tenantRoles: ["owner"],
  appRoles: ["owner"],
  capabilities: ["seumei.read", "seumei.write"],
  sessionId: "session-a",
  traceId: "trace-a",
} as const

await expect(
  resolveSeumeiSession(request, async () => ({
    session: authenticatedSession,
    context,
    opaqueId: "opaque-a",
    accessToken: "access-a",
  })),
).resolves.toMatchObject({
  kind: "authenticated",
  actor: { sessionUserId: "user-a", tenantId: "tenant-a", appId: "seumei" },
})
```

Also test null session → `signed-out`, resolver exception → `unavailable`, and context with `appId: "contracts"` → `unavailable`.

- [ ] **Step 2: Run tests to verify the old mock implementation fails**

Run:

```powershell
corepack pnpm --filter @matriz/app-seumei test -- src/auth/server-session.test.ts
```

Expected: FAIL because the existing function accepts a cookie string and fetches `/api/auth/mock/session`.

- [ ] **Step 3: Extend `SessionActor` with immutable authority**

Implement this exact interface:

```ts
export interface SessionActor {
  readonly sessionUserId: string
  readonly name: string
  readonly email: string
  readonly tenantId: string
  readonly appId: "seumei"
  readonly membershipId: string
  readonly tenantRoles: readonly string[]
  readonly appRoles: readonly string[]
  readonly capabilities: readonly string[]
  readonly sessionId: string
  readonly traceId: string
}
```

- [ ] **Step 4: Implement durable OIDC resolution**

`resolveSeumeiSession` accepts a `Request` and an optional resolver with the same signature as `resolveOidcServerSessionDurable`. It calls the resolver with `oidcConfig()`, rejects any context whose `appId !== "seumei"`, copies identity display fields from the stored `AuthSession`, and freezes authority arrays before returning the actor.

- [ ] **Step 5: Propagate the request-based resolver**

Update `executeCompanyRequest`, page session resolution, invitation acceptance and invitation page to pass the full `Request`. Remove all runtime references to `monorepoConfig.baseUrls["matriz-hub"]` and `/api/auth/mock/session` from Seumei.

- [ ] **Step 6: Run focused auth and HTTP boundary tests**

```powershell
$tests = @(
  'src/auth/server-session.test.ts',
  'src/http/company-routes.test.ts',
  'src/http/membership-routes.test.ts'
)
corepack pnpm --filter @matriz/app-seumei test -- $tests
```

Expected: PASS; wrong-app and signed-out sessions never reach `createCompanyServices`.

- [ ] **Step 7: Commit the authority boundary**

```powershell
git add apps/seumeiapp/src/types/session-actor.ts apps/seumeiapp/src/auth apps/seumeiapp/src/http/next-boundary.ts apps/seumeiapp/app/api/invitations/accept/route.ts apps/seumeiapp/app/invite
git commit -m "fix(seumei): use durable oidc authorization context"
```

### Task 2: Introduce a typed tenant transaction executor

**Files:**

- Modify: `packages/platform/db/src/tenant-context.ts`
- Modify: `packages/platform/db/src/seumei.ts`
- Create: `packages/platform/db/src/tenant-context.test.ts`
- Modify: `packages/platform/db/package.json`
- Create: `packages/platform/db/vitest.config.ts`
- Create: `apps/seumeiapp/src/infrastructure/tenant-executor.ts`
- Create: `apps/seumeiapp/src/infrastructure/tenant-executor.test.ts`

**Interfaces:**

- Consumes: `withTenantContext(client, tenantId, work)`.
- Produces: `TenantExecutor<TTransaction>` and `createSeumeiTenantExecutor(db): SeumeiTenantExecutor` with `run<TResult>(tenantId, work)`.

- [ ] **Step 1: Write failing transaction-context tests**

Test valid tenant, invalid tenant, callback receives only transaction client, and rollback propagation:

```ts
const executor = createTenantExecutor(client)
await executor.run("tenant-a", async (tx) => {
  expect(tx).toBe(transaction)
  return "ok"
})
expect(transaction.$executeRawUnsafe).toHaveBeenCalledWith(
  "SELECT set_config('matriz.tenant_id', $1, true)",
  "tenant-a",
)
```

- [ ] **Step 2: Run tests to verify the executor is absent**

```powershell
corepack pnpm --filter @matriz/platform-db test -- src/tenant-context.test.ts
```

Expected: FAIL because `createTenantExecutor` and the exported executor type do not exist.

- [ ] **Step 3: Export the generic executor**

Add to `tenant-context.ts`:

```ts
export interface TenantExecutor<TTransaction> {
  run<TResult>(
    tenantId: string,
    work: (transaction: TTransaction) => Promise<TResult>,
  ): Promise<TResult>
}

export function createTenantExecutor<TTransaction extends TenantTransaction>(
  client: TransactionClient<TTransaction>,
): TenantExecutor<TTransaction> {
  return { run: (tenantId, work) => withTenantContext(client, tenantId, work) }
}
```

Export the existing supporting types without adding product semantics.

Add `"test": "vitest run --config vitest.config.ts"` to the package scripts and
create a Node-environment config including `src/**/*.test.ts`, with
`fileParallelism: false` and `passWithNoTests: false`.

- [ ] **Step 4: Export Seumei transaction type and create app adapter**

In `packages/platform/db/src/seumei.ts`, export `SeumeiTransactionClient` from the generated Prisma namespace. In the app adapter:

```ts
export type SeumeiTenantExecutor = TenantExecutor<SeumeiTransactionClient>

export function createSeumeiTenantExecutor(db: SeumeiPrismaClient): SeumeiTenantExecutor {
  return createTenantExecutor(db)
}
```

- [ ] **Step 5: Run package and app adapter tests**

```powershell
corepack pnpm --filter @matriz/platform-db test
corepack pnpm --filter @matriz/app-seumei test -- src/infrastructure/tenant-executor.test.ts
corepack pnpm --filter @matriz/app-seumei typecheck
```

Expected: PASS; invalid tenant IDs fail before `$transaction`; callback exceptions rollback and propagate.

- [ ] **Step 6: Commit the executor**

```powershell
git add packages/platform/db/package.json packages/platform/db/vitest.config.ts packages/platform/db/src/tenant-context.ts packages/platform/db/src/tenant-context.test.ts packages/platform/db/src/seumei.ts apps/seumeiapp/src/infrastructure/tenant-executor.ts apps/seumeiapp/src/infrastructure/tenant-executor.test.ts
git commit -m "feat(db): add typed tenant transaction executor"
```

### Task 3: Bind company access and provisioning to the active tenant

**Files:**

- Modify: `apps/seumeiapp/src/domain/repositories/company-repository.ts`
- Modify: `apps/seumeiapp/src/infrastructure/company.repository.ts`
- Modify: `apps/seumeiapp/src/infrastructure/company.repository.test.ts`
- Modify: `apps/seumeiapp/src/application/company-access.ts`
- Modify: `apps/seumeiapp/src/application/company-access.test.ts`
- Modify: `apps/seumeiapp/src/application/provision-company.ts`
- Modify: `apps/seumeiapp/src/application/provision-company.test.ts`
- Modify: `apps/seumeiapp/src/application/company-memberships.ts`
- Modify: `apps/seumeiapp/src/application/company-memberships.test.ts`
- Modify: `apps/seumeiapp/src/application/company-onboarding.ts`
- Modify: related HTTP tests under `apps/seumeiapp/src/http`.

**Interfaces:**

- Consumes: `SessionActor.tenantId` and `SeumeiTenantExecutor`.
- Produces: `listVisible(tenantId)`, `findById(companyId, tenantId)`, and tenant-bound provisioning methods; no repository method accepts an array of tenant IDs.

- [ ] **Step 1: Write failing active-tenant application tests**

Use an actor bound to `tenant-a` and assert only that tenant reaches the repository even when Identity reports other memberships:

```ts
await listAuthorizedCompanies(actor, core, companies)
expect(companies.listVisible).toHaveBeenCalledWith("tenant-a")
expect(companies.listVisible).not.toHaveBeenCalledWith("tenant-b")
```

Test that `companyId` belonging to Tenant B is denied before a product mutation.

- [ ] **Step 2: Run the company tests and confirm failure**

```powershell
$tests = @(
  'src/application/company-access.test.ts',
  'src/application/provision-company.test.ts',
  'src/application/company-memberships.test.ts',
  'src/infrastructure/company.repository.test.ts'
)
corepack pnpm --filter @matriz/app-seumei test -- $tests
```

Expected: FAIL because current interfaces use `tenantIds[]` and cross-tenant queries.

- [ ] **Step 3: Replace repository interfaces with singular tenant methods**

Use these signatures:

```ts
listVisible(tenantId: string): Promise<readonly Company[]>
findById(companyId: string, tenantId: string): Promise<Company | null>
findByIdempotency(
  tenantId: string,
  userId: string,
  key: string,
): Promise<Company | null>
```

All existing create/onboarding/compensation methods retain an explicit server-derived `tenantId`.

- [ ] **Step 4: Run every company repository operation through the executor**

Construct the repository with `SeumeiTenantExecutor`, call `executor.run(tenantId, tx => ...)`, and replace every `db.*` with `tx.*`. Existing nested `$transaction` calls become direct sequences inside the already-open tenant transaction.

- [ ] **Step 5: Make Seumei provision only the active organization**

`provisionCompany` uses `actor.tenantId`; it no longer generates a tenant or calls `core.provisionOwner`. The tenant must already exist and contain an active `AppGrant(seumei)`. Idempotency lookup is scoped to `actor.tenantId`. Keep compensation only for Seumei-local records.

- [ ] **Step 6: Update company access and membership use cases**

Resolve one company under `actor.tenantId`. Use the authorization context's membership/roles for the active tenant; call Identity only for member administration and invitation workflows that require global user data.

- [ ] **Step 7: Run all Seumei company tests**

```powershell
$tests = @(
  'src/application/company-access.test.ts',
  'src/application/provision-company.test.ts',
  'src/application/company-memberships.test.ts',
  'src/application/company-onboarding.test.ts',
  'src/infrastructure/company.repository.test.ts',
  'src/http/company-routes.test.ts',
  'src/http/membership-routes.test.ts'
)
corepack pnpm --filter @matriz/app-seumei test -- $tests
```

Expected: PASS; no product query receives more than one tenant.

- [ ] **Step 8: Commit active-tenant company behavior**

```powershell
git add apps/seumeiapp/src/domain/repositories/company-repository.ts apps/seumeiapp/src/infrastructure/company.repository.ts apps/seumeiapp/src/infrastructure/company.repository.test.ts apps/seumeiapp/src/application apps/seumeiapp/src/http
git commit -m "refactor(seumei): bind company operations to active tenant"
```

### Task 4: Enforce tenant transactions in every private repository

**Files:**

- Modify/Test: `apps/seumeiapp/src/infrastructure/catalog.repository.ts`
- Modify/Test: `apps/seumeiapp/src/infrastructure/restaurant.repository.ts`
- Modify/Test: `apps/seumeiapp/src/infrastructure/commerce.repository.ts`
- Modify/Test: `apps/seumeiapp/src/infrastructure/finance.repository.ts`
- Modify/Test: `apps/seumeiapp/src/infrastructure/store-design.repository.ts`
- Modify/Test: `apps/seumeiapp/src/infrastructure/portfolio.repository.ts`
- Modify: matching interfaces under `apps/seumeiapp/src/domain/repositories`.
- Modify: `apps/seumeiapp/src/application/composition.ts`.

**Interfaces:**

- Consumes: `SeumeiTenantExecutor` and one server-derived tenant ID per method.
- Produces: repository factories that cannot issue private queries without `executor.run(tenantId, work)`.

- [ ] **Step 1: Add failing executor contract tests to every repository**

For each repository, inject a fake executor and assert the requested tenant and transaction client:

```ts
const executor = {
  run: vi.fn(async (tenantId, work) => {
    expect(tenantId).toBe("tenant-a")
    return work(tx)
  }),
}
await repository.listProducts("tenant-a")
expect(executor.run).toHaveBeenCalledOnce()
```

For multi-step mutations assert there is exactly one executor call, so reads, writes and outbox changes share one transaction.

- [ ] **Step 2: Run repository suites and confirm failure**

```powershell
corepack pnpm --filter @matriz/app-seumei test -- src/infrastructure
```

Expected: FAIL because the factories currently accept raw `SeumeiPrismaClient` and several methods open their own transactions.

- [ ] **Step 3: Convert catalog and restaurant repositories**

Factories accept `SeumeiTenantExecutor`. Each public method's first authority argument is `tenantId`. Inside `executor.run`, use `tx` for every query and preserve optimistic-version and idempotency checks.

- [ ] **Step 4: Convert finance and store-design repositories**

Use one tenant transaction per command. Preserve immutable finance event history, store publication snapshots, optimistic versions and outbox writes in the same transaction.

- [ ] **Step 5: Convert private commerce operations**

Keep `listOrders`, `findOrder`, `transitionOrder`, `listCustomers` and `findCustomer` behind a supplied tenant. Remove public slug resolution and public checkout from this private repository; those move to Task 5.

- [ ] **Step 6: Convert portfolio to active tenant**

Replace `listCompanySummaries(tenantIds)` with:

```ts
listCompanySummary(
  tenantId: string,
): Promise<PortfolioCompanySummaryRecord | null>
```

The Seumei portfolio endpoint reports the active organization. A cross-organization portfolio belongs to Hub/WillDash orchestration through versioned APIs, not a cross-tenant SQL query.

- [ ] **Step 7: Inject one executor in composition**

Create one `const tenantDb = createSeumeiTenantExecutor(getSeumeiDb())` and pass it to every private repository. Do not expose `getSeumeiDb()` outside composition/infrastructure.

- [ ] **Step 8: Run all repository and application tests**

```powershell
corepack pnpm --filter @matriz/app-seumei test -- src/infrastructure src/application src/http
corepack pnpm --filter @matriz/app-seumei typecheck
```

Expected: PASS; `rg -n "\bdb\." apps/seumeiapp/src/infrastructure/*.repository.ts` finds no private query outside an explicitly documented public resolver.

- [ ] **Step 9: Commit private repository isolation**

```powershell
git add apps/seumeiapp/src/infrastructure apps/seumeiapp/src/domain/repositories apps/seumeiapp/src/application/composition.ts apps/seumeiapp/src/application apps/seumeiapp/src/http
git commit -m "fix(seumei): enforce tenant transactions in repositories"
```

### Task 5: Add a restricted public storefront resolver

**Files:**

- Modify: `prisma/seumei/schema.prisma`
- Create: `prisma/seumei/migrations/202609010001_public_store_routes_and_runtime_rls/migration.sql`
- Modify: `packages/platform/db/src/seumei.ts`
- Create: `apps/seumeiapp/src/domain/repositories/public-store-route-repository.ts`
- Create: `apps/seumeiapp/src/infrastructure/public-store-route.repository.ts`
- Create: `apps/seumeiapp/src/infrastructure/public-store-route.repository.test.ts`
- Create: `apps/seumeiapp/src/application/public-storefront.ts`
- Create: `apps/seumeiapp/src/application/public-storefront.test.ts`
- Modify: public store pages/routes under `apps/seumeiapp/app/store` and `apps/seumeiapp/app/api/public/v1/stores`.
- Modify: store publication flow in `apps/seumeiapp/src/infrastructure/store-design.repository.ts`.

**Interfaces:**

- Consumes: restricted public client for slug resolution and tenant executor for published data/checkout.
- Produces: `resolvePublishedStore(storeSlug)` returning only safe routing fields, followed by tenant-scoped public reads and writes.

- [ ] **Step 1: Write failing resolver and boundary tests**

Test that a slug resolves only this shape:

```ts
{
  storeSlug: "loja-a",
  tenantId: "tenant-a",
  publicationId: "publication-a",
  canonicalHost: null,
  status: "PUBLISHED",
}
```

Assert unpublished/missing slugs return `null`; checkout uses the resolved `tenantId`; request body `tenantId` is ignored.

- [ ] **Step 2: Run tests and confirm the current slug query fails under the new contract**

```powershell
$tests = @(
  'src/infrastructure/public-store-route.repository.test.ts',
  'src/application/public-storefront.test.ts'
)
corepack pnpm --filter @matriz/app-seumei test -- $tests
```

Expected: FAIL because the projection and restricted repository do not exist.

- [ ] **Step 3: Add the Prisma projection model**

Add a model mapped to `public_store_routes` with `storeSlug` primary/unique key, `tenantId`, `publicationId`, nullable `canonicalHost`, enum/string status, `publishedAt`, and `updatedAt`. It contains no customer, order, inventory, finance or identity data.

- [ ] **Step 4: Write the SQL migration and grants**

The migration creates/updates the projection, verifies forced RLS on every tenant-owned Seumei table, revokes `PUBLIC`, and grants `SELECT` on only `seumei.public_store_routes` to `matriz_seumei_public_runtime`. The role receives no other table, sequence, function, or schema-owner privilege.

- [ ] **Step 5: Add restricted client and repository**

Export `getSeumeiPublicDb()` using `SEUMEI_PUBLIC_DATABASE_URL`. The resolver selects explicit columns and never returns a Prisma row directly.

- [ ] **Step 6: Maintain projection transactionally with publication**

Publishing upserts the route projection in the same tenant transaction as the immutable publication snapshot. Unpublishing changes its status in the same transaction. A slug change deletes the previous route and creates the new route atomically.

- [ ] **Step 7: Split public read/checkout from private commerce**

`public-storefront.ts` resolves the slug with the restricted role, then calls tenant-scoped read or checkout methods using the returned tenant. Validate that `publicationId` remains current inside the tenant transaction to prevent stale route use.

- [ ] **Step 8: Run Prisma and public flow tests**

```powershell
corepack pnpm prisma:validate:seumei
corepack pnpm prisma:generate:seumei
$tests = @(
  'src/infrastructure/public-store-route.repository.test.ts',
  'src/application/public-storefront.test.ts',
  'src/infrastructure/commerce.repository.contract.test.ts',
  'src/infrastructure/store-design.repository.contract.test.ts'
)
corepack pnpm --filter @matriz/app-seumei test -- $tests
```

Expected: PASS; public resolver has no API accepting `tenantId` from the caller.

- [ ] **Step 9: Commit the public resolver**

```powershell
git add prisma/seumei packages/platform/db/src/seumei.ts apps/seumeiapp/src/domain/repositories/public-store-route-repository.ts apps/seumeiapp/src/infrastructure apps/seumeiapp/src/application/public-storefront.ts apps/seumeiapp/src/application/public-storefront.test.ts apps/seumeiapp/app/store apps/seumeiapp/app/api/public/v1/stores
git commit -m "feat(seumei): add rls-safe public storefront resolver"
```

### Task 6: Provision the restricted public database role and environment

**Files:**

- Modify: `apps/matriz-control/desktop/infrastructure-helper.ps1`
- Modify: `apps/matriz-control/desktop/local-environment-helper.ps1`
- Modify: `apps/matriz-control/src/modules/infrastructure/integration/windows-installer-contract.test.ts`
- Modify: `apps/matriz-control/src/modules/infrastructure/integration/windows-local-environment-contract.test.ts`.
- Create: `apps/matriz-control/src/modules/infrastructure/integration/windows-seumei-public-role-contract.test.ts`.
- Modify: `apps/seumeiapp/infrastructure.json`
- Modify: `docs/infrastructure/access-matrix.md`
- Modify: `docs/infrastructure/domain-ownership-matrix.md`

**Interfaces:**

- Consumes: migration grant target `matriz_seumei_public_runtime` and `SEUMEI_PUBLIC_DATABASE_URL`.
- Produces: DPAPI-protected role credential and process-only environment injection for the Seumei public resolver.

- [ ] **Step 1: Write failing installer/environment contract tests**

Assert the helper contains:

```text
matriz_seumei_public_runtime
LOGIN NOINHERIT NOREPLICATION NOBYPASSRLS
SEUMEI_PUBLIC_DATABASE_URL
```

Assert the role receives no `BYPASSRLS`, schema ownership, migration authority, worker authority, or `GRANT ... ALL TABLES`.

- [ ] **Step 2: Run focused Control tests and confirm failure**

```powershell
$tests = @(
  'src/modules/infrastructure/integration/windows-installer-contract.test.ts',
  'src/modules/infrastructure/integration/windows-local-environment-contract.test.ts',
  'src/modules/infrastructure/integration/windows-seumei-public-role-contract.test.ts'
)
corepack pnpm --filter @matriz/app-matriz-control test -- $tests
```

Expected: FAIL because the role and environment entry are absent.

- [ ] **Step 3: Provision and protect the role credential**

Add the fixed role to the installation topology, generate its password in the elevated helper, store it only through the existing DPAPI vault pattern, and never include it in service arguments, receipts, logs or renderer responses.

- [ ] **Step 4: Inject the public URL only into Seumei processes**

Extend the closed environment catalog so only app `seumei` can request `SEUMEI_PUBLIC_DATABASE_URL`. Preserve URL redaction and Git-ignore validation.

- [ ] **Step 5: Update infrastructure declarations and matrices**

Declare the new environment reference in `apps/seumeiapp/infrastructure.json`. Document that the role may select only `seumei.public_store_routes` and owns no migration.

- [ ] **Step 6: Reconcile an already-installed local stack**

In Matriz Control, preview **Instalar stack Matriz** again and confirm through
the normal one-use token and UAC flow. The elevated helper is idempotent: it
must preserve the existing cluster and data, create or rotate only the missing
restricted role credential, and leave the external listener on `5432`
unchanged. Apply the new Seumei migration explicitly after reconciliation.

Verify with the status helper that `matriz_seumei_public_runtime` exists with
`NOBYPASSRLS` and can connect only through the injected public URL.

- [ ] **Step 7: Run infrastructure validation**

```powershell
corepack pnpm verify:infrastructure
corepack pnpm --filter @matriz/app-matriz-control test
corepack pnpm --filter @matriz/app-matriz-control typecheck
```

Expected: PASS; renderer-visible snapshots contain no credential or connection URL.

- [ ] **Step 8: Commit role provisioning**

```powershell
git add apps/matriz-control/desktop/infrastructure-helper.ps1 apps/matriz-control/desktop/local-environment-helper.ps1 apps/matriz-control/src/modules/infrastructure/integration apps/seumeiapp/infrastructure.json docs/infrastructure/access-matrix.md docs/infrastructure/domain-ownership-matrix.md
git commit -m "feat(infra): provision seumei public resolver role"
```

### Task 7: Prove isolation with live PostgreSQL and restricted roles

**Files:**

- Create: `apps/seumeiapp/src/infrastructure/seumei-postgres.integration.test.ts`
- Create: `apps/seumeiapp/vitest.postgres.config.ts`
- Modify: `apps/seumeiapp/package.json`
- Create: `apps/seumeiapp/src/infrastructure/postgres-test-fixture.ts`

**Interfaces:**

- Consumes: managed local PostgreSQL, applied Seumei migrations, runtime and public resolver URLs injected by Control.
- Produces: `test:postgres` suite proving RLS, pooling, composite constraints and public projection access.

- [ ] **Step 1: Add a gated live-test script**

Add:

```json
{
  "scripts": {
    "test:postgres": "vitest run --config vitest.postgres.config.ts"
  }
}
```

Create a dedicated config that includes only `**/*.integration.test.ts`, runs serially, uses a bounded timeout, and refuses to run unless the host is loopback and port is `55432`.

- [ ] **Step 2: Write failing Tenant A versus Tenant B tests**

Seed two tenant IDs with distinct companies/products/orders using migration authority fixture setup. Connect application assertions with `matriz_seumei_runtime` and verify:

```ts
await expect(tenantA.company.findMany()).resolves.toContainEqual(
  expect.objectContaining({ tenantId: "tenant-a" }),
)
await expect(
  tenantA.company.findFirst({
    where: { id: tenantBCompanyId },
  }),
).resolves.toBeNull()
```

Cover SELECT, INSERT, UPDATE, DELETE, aggregate, known foreign ID, forged request tenant, cross-tenant composite relation, absent context and rollback.

- [ ] **Step 3: Add pooled-connection leakage test**

Run alternating Tenant A/B transactions through the same Prisma client for at least 100 iterations. After each transaction execute a query without `SET LOCAL` and assert zero tenant-owned rows. This proves `is_local=true` does not leak authority after commit/rollback.

- [ ] **Step 4: Add public resolver privilege tests**

Connect with `matriz_seumei_public_runtime`; assert it can select explicit columns from `public_store_routes` and receives permission denied for `companies`, `customers`, `commerce_orders`, `financial_entries`, sequences and mutation of the projection.

- [ ] **Step 5: Run live tests and observe the first real failures**

```powershell
corepack pnpm --filter @matriz/app-seumei test:postgres
```

Expected before Tasks 3–6 are complete: failure due missing transaction context, projection or restricted grants. Expected after completion: all tests PASS.

- [ ] **Step 6: Run the suite twice to detect fixture leakage**

```powershell
corepack pnpm --filter @matriz/app-seumei test:postgres
corepack pnpm --filter @matriz/app-seumei test:postgres
```

Expected: both runs PASS with isolated fixture identifiers and deterministic cleanup through explicit test schema records, not broad database deletion.

- [ ] **Step 7: Commit live isolation proof**

```powershell
git add apps/seumeiapp/src/infrastructure/seumei-postgres.integration.test.ts apps/seumeiapp/src/infrastructure/postgres-test-fixture.ts apps/seumeiapp/vitest.postgres.config.ts apps/seumeiapp/package.json
git commit -m "test(seumei): prove postgres tenant isolation"
```

### Task 8: Close the Seumei multitenancy gate

**Files:**

- Modify: `apps/seumeiapp/README.md`
- Modify: `docs/MATRIZ-DATA-PLATFORM-COCKPIT.md`
- Create: `docs/audit/2026-09-01-seumei-multitenancy-acceptance.md`

**Interfaces:**

- Consumes: passing unit, contract, live PostgreSQL, boundary, migration and build checks.
- Produces: binary evidence for the statement “Seumei is multitenant under restricted PostgreSQL roles.”

- [ ] **Step 1: Run full scoped verification**

```powershell
corepack pnpm prisma:generate:seumei
corepack pnpm prisma:validate:seumei
corepack pnpm --filter @matriz/platform-db test
corepack pnpm --filter @matriz/app-seumei test
corepack pnpm --filter @matriz/app-seumei test:postgres
corepack pnpm --filter @matriz/app-seumei lint
corepack pnpm --filter @matriz/app-seumei typecheck
corepack pnpm --filter @matriz/app-seumei build
corepack pnpm typecheck
corepack pnpm verify:boundaries
corepack pnpm verify:infrastructure
corepack pnpm prisma:migrate:drift
```

Expected: every command exits `0`; live suite proves negative isolation cases; no drift exists.

- [ ] **Step 2: Perform architecture and secret scans**

```powershell
rg -n "apps/[^/]+/(src|app)/" apps/seumeiapp packages/platform/db
rg -n "/api/auth/mock/session|listVisibleByTenantIds|findByIdForTenantIds" apps/seumeiapp
rg -n "BYPASSRLS|GRANT\s+ALL" prisma/seumei apps/matriz-control/desktop docs/infrastructure
corepack pnpm verify:tracked-artifacts
git status --short
```

Expected: no cross-app internal import; no mock session or multi-tenant product repository API; only explicit negative assertions mention `BYPASSRLS`/broad grants; no secret or generated runtime artifact is tracked.

- [ ] **Step 3: Write acceptance evidence**

Record command, exit code, test count and the ten isolation cases from the cockpit. Do not include connection strings, credentials, raw customer data, dumps or verbose logs. Set result to `ACCEPTED` only when all ten cases pass.

- [ ] **Step 4: Update user-facing and architectural documentation**

Document active-tenant semantics, tenant switching through OIDC, public storefront projection, required local services, `test:postgres`, and the evidence link. Change the cockpit state from “prepared” to “proven” only if the acceptance document is `ACCEPTED`.

- [ ] **Step 5: Commit the gate evidence**

```powershell
git add apps/seumeiapp/README.md docs/MATRIZ-DATA-PLATFORM-COCKPIT.md docs/audit/2026-09-01-seumei-multitenancy-acceptance.md
git commit -m "docs: accept seumei multitenancy gate"
```
