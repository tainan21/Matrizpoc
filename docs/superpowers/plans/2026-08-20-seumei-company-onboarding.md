# Seumei Company Provisioning and Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver authenticated company creation/selection, initial owner membership, persistent onboarding and entry into a tenant-isolated Seumei workspace.

**Architecture:** Keep company and onboarding domain code app-local in `apps/seumeiapp`. Resolve identity and memberships from Core through an app-local adapter, persist company/onboarding through the Seumei Prisma surface, and treat an HTTP-only active-company cookie as an untrusted preference that is re-authorized on every request.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.6, Prisma 5, Vitest, Testing Library, public MatrizLib packages.

**Spec:** `docs/superpowers/specs/2026-08-20-seumei-company-onboarding-design.md`

## Global Constraints

- Public identity remains `seumei`, package remains `@matriz/app-seumei`, and development port remains `3008`.
- Work primarily in `apps/seumeiapp`; schema and migration changes are limited to Seumei unless a tested invariant proves Core must change.
- Never import `apps/<other-app>/src/**` or `apps/<other-app>/app/**`.
- Never move Seumei domain behavior into a shared package.
- Browser request bodies never accept `tenantId` as authority.
- Every company/onboarding query and mutation receives server-derived tenant and user context.
- Missing database configuration is explicit and never falls back to mock business data.
- The incoming reference remains unmodified and outside the workspace graph.
- Apply no migration to an external database without separate operator authority.
- Preserve unrelated user changes and commit only files from the current task.

---

### Task 1: Additive Seumei company persistence

**Files:**
- Create: `apps/seumeiapp/src/domain/company-schema.contract.test.ts`
- Modify: `prisma/schemas/seumei.prisma`
- Create: `prisma/migrations/seumei/202608200001_company_onboarding/migration.sql`

**Interfaces:**
- Produces Prisma models `Company` and `CompanyOnboarding`.
- Produces enums `CompanyStatus`, `CompanyOperationType`, and `CompanyOnboardingStep`.
- Preserves all existing Seumei tables and enums.

- [ ] **Step 1: Write the failing schema contract test**

```ts
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Seumei company persistence contract", () => {
  const schema = readFileSync(resolve(process.cwd(), "../../prisma/schemas/seumei.prisma"), "utf8")

  it("models company and resumable onboarding with tenant constraints", () => {
    expect(schema).toContain("model Company {")
    expect(schema).toContain("tenantId          String        @unique")
    expect(schema).toContain("@@unique([createdByUserId, idempotencyKey])")
    expect(schema).toContain("model CompanyOnboarding {")
    expect(schema).toContain("companyId          String   @unique")
    expect(schema).toContain("tenantId           String   @unique")
    expect(schema).toContain("version            Int      @default(1)")
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter @matriz/app-seumei test -- src/domain/company-schema.contract.test.ts`

Expected: FAIL because `model Company` is absent.

- [ ] **Step 3: Add the minimal additive Prisma models**

Append models equivalent to:

```prisma
enum CompanyStatus { PROVISIONING ONBOARDING ACTIVE PROVISIONING_FAILED }
enum CompanyOperationType { PHYSICAL_STORE ONLINE_STORE SERVICE HYBRID }
enum CompanyOnboardingStep { IDENTITY OPERATION PREFERENCES REVIEW COMPLETED }

model Company {
  id                String                @id @default(cuid())
  tenantId          String                @unique
  name              String
  slug              String                @unique
  createdByUserId   String
  idempotencyKey    String
  status            CompanyStatus         @default(PROVISIONING)
  operationType     CompanyOperationType?
  city              String?
  country           String                @default("BR")
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  onboarding        CompanyOnboarding?

  @@unique([createdByUserId, idempotencyKey])
  @@index([createdByUserId, status])
  @@map("companies")
}

model CompanyOnboarding {
  id                 String                   @id @default(cuid())
  companyId          String                   @unique
  tenantId           String                   @unique
  currentStep        CompanyOnboardingStep    @default(IDENTITY)
  version            Int                      @default(1)
  draftName          String
  draftSlug          String
  draftOperationType CompanyOperationType?
  draftCity          String?
  draftCountry       String                   @default("BR")
  draftCurrency      String                   @default("BRL")
  completedSteps     String[]
  startedAt          DateTime                 @default(now())
  completedAt        DateTime?
  updatedAt          DateTime                 @updatedAt
  company            Company                  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@index([tenantId, currentStep])
  @@map("company_onboarding")
}
```

Create SQL using `CREATE TYPE`, `CREATE TABLE`, foreign key with `ON DELETE CASCADE`, unique constraints and indexes matching the Prisma schema. Do not drop or mutate existing tables.

- [ ] **Step 4: Verify GREEN and validate the schema**

Run:

```powershell
pnpm --filter @matriz/app-seumei test -- src/domain/company-schema.contract.test.ts
pnpm run prisma:validate:seumei
pnpm run prisma:generate:seumei
```

Expected: test PASS; Prisma schema valid; generated client updated locally.

- [ ] **Step 5: Commit the persistence contract**

```powershell
git add apps/seumeiapp/src/domain/company-schema.contract.test.ts prisma/schemas/seumei.prisma prisma/migrations/seumei/202608200001_company_onboarding/migration.sql
git commit -m "feat(seumei): model company onboarding persistence"
```

### Task 2: Company domain validation and view models

**Files:**
- Create: `apps/seumeiapp/src/domain/company.ts`
- Create: `apps/seumeiapp/src/domain/company.test.ts`
- Create: `apps/seumeiapp/src/ui/presenters/company.presenter.ts`
- Create: `apps/seumeiapp/src/ui/presenters/company.presenter.test.ts`

**Interfaces:**
- Produces `Company`, `CompanyOnboarding`, `CompanyRole`, `CompanyOperationType`, `CompanyStatus`.
- Produces `normalizeCompanyInput(input)` and `validateOnboardingDraft(draft)`.
- Produces `toCompanyChoiceViewModel`, `toOnboardingViewModel`, and `toWorkspaceViewModel`.

- [ ] **Step 1: Write failing validation tests**

```ts
it("normalizes company identity without accepting tenant authority", () => {
  expect(normalizeCompanyInput({ name: "  Café Aurora  ", slug: " Café Aurora " }))
    .toEqual({ name: "Café Aurora", slug: "cafe-aurora" })
})

it("rejects an empty name and unsafe slug", () => {
  expect(() => normalizeCompanyInput({ name: " ", slug: "../x" }))
    .toThrowError(InvalidCompanyInputError)
})
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @matriz/app-seumei test -- src/domain/company.test.ts`

Expected: FAIL because the domain module does not exist.

- [ ] **Step 3: Implement focused domain types and validation**

Use these signatures:

```ts
export type CompanyOperationType = "PHYSICAL_STORE" | "ONLINE_STORE" | "SERVICE" | "HYBRID"
export type CompanyStatus = "PROVISIONING" | "ONBOARDING" | "ACTIVE" | "PROVISIONING_FAILED"
export type CompanyRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
export type OnboardingStep = "IDENTITY" | "OPERATION" | "PREFERENCES" | "REVIEW" | "COMPLETED"

export interface SessionActor {
  readonly sessionUserId: string
  readonly name: string
  readonly email: string
}

export interface Company {
  readonly id: string
  readonly tenantId: string
  readonly name: string
  readonly slug: string
  readonly createdByUserId: string
  readonly status: CompanyStatus
  readonly operationType: CompanyOperationType | null
  readonly city: string | null
  readonly country: string
}

export interface CompanyOnboarding {
  readonly companyId: string
  readonly tenantId: string
  readonly currentStep: OnboardingStep
  readonly version: number
  readonly draftName: string
  readonly draftSlug: string
  readonly draftOperationType: CompanyOperationType | null
  readonly draftCity: string | null
  readonly draftCountry: string
  readonly draftCurrency: "BRL" | "USD" | "EUR"
  readonly completedSteps: readonly OnboardingStep[]
  readonly completedAt: string | null
}

export function normalizeCompanyInput(input: { name: string; slug?: string }): { name: string; slug: string }
export function validateOnboardingDraft(draft: CompanyOnboarding): readonly string[]
```

Slug normalization must remove diacritics, lowercase, collapse non-alphanumeric runs to `-`, trim dashes and reject an empty result. Names must be 2-80 characters and slugs 2-64 characters.

- [ ] **Step 4: Write failing presenter tests**

Assert that presenter outputs contain display strings/actions but omit `tenantId`, `createdByUserId` and `idempotencyKey`.

- [ ] **Step 5: Implement presenters and verify GREEN**

Run: `pnpm --filter @matriz/app-seumei test -- src/domain/company.test.ts src/ui/presenters/company.presenter.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 6: Commit domain and presenters**

```powershell
git add apps/seumeiapp/src/domain/company.ts apps/seumeiapp/src/domain/company.test.ts apps/seumeiapp/src/ui/presenters/company.presenter.ts apps/seumeiapp/src/ui/presenters/company.presenter.test.ts
git commit -m "feat(seumei): define company domain view models"
```

### Task 3: Authorization-first company access use cases

**Files:**
- Create: `apps/seumeiapp/src/domain/repositories/company-repository.ts`
- Create: `apps/seumeiapp/src/domain/repositories/core-access-repository.ts`
- Create: `apps/seumeiapp/src/application/company-access.ts`
- Create: `apps/seumeiapp/src/application/company-access.test.ts`

**Interfaces:**
- Consumes domain types from Task 2.
- Produces repository ports and `listAuthorizedCompanies`, `selectAuthorizedCompany`, `resolveAuthorizedCompany`.

- [ ] **Step 1: Define ports through a failing authorization test**

```ts
it("denies a known company when the actor has no membership for its tenant", async () => {
  const core = fakeCoreAccess({ memberships: [{ tenantId: "tenant_a", role: "OWNER" }] })
  const companies = fakeCompanies([{ id: "company_b", tenantId: "tenant_b", status: "ACTIVE" }])

  await expect(selectAuthorizedCompany({ userId: "user_a", companyId: "company_b" }, core, companies))
    .rejects.toBeInstanceOf(CompanyAccessDeniedError)
})
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @matriz/app-seumei test -- src/application/company-access.test.ts`

Expected: FAIL because ports/use cases are absent.

- [ ] **Step 3: Implement exact ports**

```ts
export interface CoreAccessRepository {
  resolveUser(actor: SessionActor): Promise<{ id: string; name: string; email: string }>
  listSeumeiMemberships(userId: string): Promise<readonly { tenantId: string; role: CompanyRole }[]>
  hasSeumeiMembership(userId: string, tenantId: string): Promise<boolean>
  provisionOwner(input: { tenantId: string; tenantName: string; tenantSlug: string; userId: string }): Promise<void>
  removeProvisionedTenant(input: { tenantId: string; userId: string }): Promise<void>
}

export interface CreateProvisioningRecord {
  readonly tenantId: string
  readonly name: string
  readonly slug: string
  readonly createdByUserId: string
  readonly idempotencyKey: string
}

export interface SaveOnboardingRecord {
  readonly companyId: string
  readonly tenantId: string
  readonly expectedVersion: number
  readonly next: CompanyOnboarding
}

export interface CompleteOnboardingRecord {
  readonly companyId: string
  readonly tenantId: string
  readonly expectedVersion: number
  readonly operationType: CompanyOperationType
  readonly city: string
  readonly country: string
  readonly currency: "BRL" | "USD" | "EUR"
}

export interface CompanyRepository {
  listVisibleByTenantIds(tenantIds: readonly string[]): Promise<readonly Company[]>
  findByIdForTenantIds(companyId: string, tenantIds: readonly string[]): Promise<Company | null>
  findByActorIdempotency(userId: string, key: string): Promise<Company | null>
  createProvisioning(input: CreateProvisioningRecord): Promise<Company>
  markOnboarding(companyId: string, tenantId: string): Promise<Company>
  markProvisioningFailed(companyId: string, tenantId: string): Promise<void>
  removeProvisioning(companyId: string, tenantId: string): Promise<void>
  readOnboarding(companyId: string, tenantId: string): Promise<CompanyOnboarding | null>
  saveOnboarding(input: SaveOnboardingRecord): Promise<CompanyOnboarding>
  completeOnboarding(input: CompleteOnboardingRecord): Promise<{ company: Company; onboarding: CompanyOnboarding }>
}
```

- [ ] **Step 4: Implement list/selection as membership intersection**

`listAuthorizedCompanies` must query memberships first and pass only those tenant IDs to the company repository. `selectAuthorizedCompany` must return the same denial for missing and foreign companies.

- [ ] **Step 5: Verify GREEN, including two-tenant negatives**

Run: `pnpm --filter @matriz/app-seumei test -- src/application/company-access.test.ts`

Expected: list intersection, valid selection and tenant A/B denial tests PASS.

- [ ] **Step 6: Commit access use cases**

```powershell
git add apps/seumeiapp/src/domain/repositories apps/seumeiapp/src/application/company-access.ts apps/seumeiapp/src/application/company-access.test.ts
git commit -m "feat(seumei): enforce company membership access"
```

### Task 4: Idempotent company provisioning saga

**Files:**
- Create: `apps/seumeiapp/src/application/provision-company.ts`
- Create: `apps/seumeiapp/src/application/provision-company.test.ts`

**Interfaces:**
- Consumes `CoreAccessRepository`, `CompanyRepository`, `SessionActor` and normalization from Tasks 2-3.
- Produces `provisionCompany(input, actor, core, companies, ids)`.

- [ ] **Step 1: Write the failing happy-path test**

Assert ordered calls: resolve Core user, create Seumei provisioning aggregate, provision Core tenant/registration/owner, mark company onboarding. Assert generated tenant ID is repository-derived and input has no tenant field.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @matriz/app-seumei test -- src/application/provision-company.test.ts`

Expected: FAIL because `provisionCompany` is absent.

- [ ] **Step 3: Implement the minimal saga**

```ts
export interface ProvisionCompanyInput {
  readonly name: string
  readonly slug?: string
  readonly idempotencyKey: string
}

export interface IdGenerator { tenantId(): string }

export async function provisionCompany(
  input: ProvisionCompanyInput,
  actor: SessionActor,
  core: CoreAccessRepository,
  companies: CompanyRepository,
  ids: IdGenerator,
): Promise<Company>
```

Validate idempotency keys as UUIDs. Return an existing record for the same Core user/key. On Core failure, remove the provisional aggregate; if removal fails, mark `PROVISIONING_FAILED` and throw `CompanyProvisioningUnavailableError` with a generated correlation ID.

- [ ] **Step 4: Add RED tests for idempotency, slug conflict and compensation**

Each test asserts observable repository calls and returned error type, not mock call counts alone.

- [ ] **Step 5: Implement and verify GREEN**

Run: `pnpm --filter @matriz/app-seumei test -- src/application/provision-company.test.ts`

Expected: happy path, retry, conflict, compensation success and compensation failure PASS.

- [ ] **Step 6: Commit provisioning**

```powershell
git add apps/seumeiapp/src/application/provision-company.ts apps/seumeiapp/src/application/provision-company.test.ts
git commit -m "feat(seumei): provision tenant owner and company"
```

### Task 5: Persistent resumable onboarding use cases

**Files:**
- Create: `apps/seumeiapp/src/application/company-onboarding.ts`
- Create: `apps/seumeiapp/src/application/company-onboarding.test.ts`

**Interfaces:**
- Produces `readCompanyOnboarding`, `saveCompanyOnboardingStep`, `completeCompanyOnboarding`.
- All signatures consume `{ companyId, tenantId, userId }` from validated server context, never request bodies.

- [ ] **Step 1: Write failing resume and conflict tests**

```ts
it("resumes the persisted step and version", async () => {
  await expect(readCompanyOnboarding(context, repository)).resolves.toMatchObject({ currentStep: "OPERATION", version: 3 })
})

it("rejects a stale expected version without overwriting progress", async () => {
  await expect(saveCompanyOnboardingStep(context, {
    expectedVersion: 2,
    step: "OPERATION",
    values: { operationType: "ONLINE_STORE", city: "Recife", country: "BR" },
  }, repository))
    .rejects.toBeInstanceOf(OnboardingConflictError)
})
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @matriz/app-seumei test -- src/application/company-onboarding.test.ts`

Expected: FAIL because onboarding use cases are absent.

- [ ] **Step 3: Implement step validation and optimistic versioning**

Allowed values are restricted by step. `OPERATION` accepts operation type, city and country; `PREFERENCES` accepts `BRL`, `USD` or `EUR`; `REVIEW` accepts no arbitrary data. Repository writes include expected version in the update predicate.

- [ ] **Step 4: Add failing completion tests**

Cover missing required values, active company transition, preference update, repeated completion and denial for a foreign tenant context.

- [ ] **Step 5: Implement completion and verify GREEN**

Run: `pnpm --filter @matriz/app-seumei test -- src/application/company-onboarding.test.ts`

Expected: all onboarding behavior and tenancy tests PASS.

- [ ] **Step 6: Commit onboarding use cases**

```powershell
git add apps/seumeiapp/src/application/company-onboarding.ts apps/seumeiapp/src/application/company-onboarding.test.ts
git commit -m "feat(seumei): persist resumable company onboarding"
```

### Task 6: Prisma adapters and explicit configuration

**Files:**
- Create: `apps/seumeiapp/src/infrastructure/database-config.ts`
- Create: `apps/seumeiapp/src/infrastructure/database-config.test.ts`
- Create: `apps/seumeiapp/src/infrastructure/core-access.repository.ts`
- Create: `apps/seumeiapp/src/infrastructure/core-access.repository.test.ts`
- Create: `apps/seumeiapp/src/infrastructure/company.repository.ts`
- Create: `apps/seumeiapp/src/infrastructure/company.repository.test.ts`

**Interfaces:**
- Implements ports from Task 3 using `@matriz/platform-db/core` and `@matriz/platform-db/seumei`.
- Produces `resolveDatabaseAvailability(env)` before any Prisma client construction.

- [ ] **Step 1: Write failing missing-configuration tests**

Assert `{ kind: "unavailable", missing: ["CORE_DATABASE_URL", "SEUMEI_DATABASE_URL"] }` when neither app-specific URL nor `DATABASE_URL` exists, and `{ kind: "ready" }` when both are resolvable.

- [ ] **Step 2: Verify RED and implement configuration resolution**

Run: `pnpm --filter @matriz/app-seumei test -- src/infrastructure/database-config.test.ts`

Expected after implementation: PASS without constructing Prisma.

- [ ] **Step 3: Write failing adapter contract tests with injected Prisma-shaped fakes**

Assert:

- Core provisioning uses `$transaction` and creates tenant, app registration and owner membership;
- Core membership queries include `userId` and `appId: "seumei"`;
- Seumei company lookup includes the actor's authorized tenant ID set and has no unscoped `findById` method;
- onboarding reads/writes contain both `companyId` and `tenantId`;
- versioned update uses `{ companyId, tenantId, version: expectedVersion }`;
- completion updates company, onboarding and `SeumeiPreference` inside one `$transaction`.

- [ ] **Step 4: Implement adapters using injected clients**

Factories use these signatures:

```ts
export function createCoreAccessRepository(db: CorePrismaClient): CoreAccessRepository
export function createCompanyRepository(db: SeumeiPrismaClient): CompanyRepository
```

The production composition obtains clients only after `resolveDatabaseAvailability` returns ready.

- [ ] **Step 5: Verify adapter GREEN and all app tests**

Run: `pnpm --filter @matriz/app-seumei test`

Expected: all tests PASS with no live database dependency.

- [ ] **Step 6: Commit adapters**

```powershell
git add apps/seumeiapp/src/infrastructure
git commit -m "feat(seumei): connect company flow to scoped prisma adapters"
```

### Task 7: Server actor, active-company context and HTTP boundaries

**Files:**
- Modify: `apps/seumeiapp/src/auth/server-session.ts`
- Create: `apps/seumeiapp/src/auth/server-session.test.ts`
- Create: `apps/seumeiapp/src/auth/active-company.ts`
- Create: `apps/seumeiapp/src/auth/active-company.test.ts`
- Create: `apps/seumeiapp/src/application/composition.ts`
- Create: `apps/seumeiapp/app/api/companies/route.ts`
- Create: `apps/seumeiapp/app/api/company-selection/route.ts`
- Create: `apps/seumeiapp/app/api/onboarding/route.ts`
- Create: `apps/seumeiapp/src/http/company-routes.test.ts`

**Interfaces:**
- Produces discriminated `SessionResolution`: authenticated, signed-out or unavailable.
- Produces `ACTIVE_COMPANY_COOKIE = "seumei_active_company"`.
- Route request DTOs contain no tenant ID.

- [ ] **Step 1: Write failing session-resolution tests**

Cover Hub 401 → signed-out, fetch failure/5xx → unavailable, valid session → actor containing session user ID/name/email only. Do not use the session tenant array as membership authority.

- [ ] **Step 2: Implement and verify session RED→GREEN**

Run: `pnpm --filter @matriz/app-seumei test -- src/auth/server-session.test.ts`

- [ ] **Step 3: Write failing active-company tests**

Use actor A, memberships for tenant A and a cookie naming company B. Expect a generic forbidden/selection-needed result and no company B view model.

- [ ] **Step 4: Implement active context resolution**

Cookie helpers set `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, and `secure: process.env.NODE_ENV === "production"`. Every resolution calls `selectAuthorizedCompany` or `resolveAuthorizedCompany`.

- [ ] **Step 5: Write failing route contract tests**

Test handlers through injected command factories. Assert:

- company POST accepts `{ name, slug, idempotencyKey }` and ignores/rejects `tenantId`;
- selection POST accepts only `{ companyId }` and returns 204 with validated cookie;
- onboarding PATCH accepts `{ expectedVersion, step, values }`;
- onboarding POST completion derives context from the cookie;
- unauthorized/forbidden/conflict/unavailable map to 401/403/409/503.

- [ ] **Step 6: Implement thin handlers and verify GREEN**

Run: `pnpm --filter @matriz/app-seumei test -- src/http/company-routes.test.ts src/auth/active-company.test.ts`

Expected: route and context tests PASS.

- [ ] **Step 7: Commit server boundaries**

```powershell
git add apps/seumeiapp/src/auth apps/seumeiapp/src/application/composition.ts apps/seumeiapp/src/http apps/seumeiapp/app/api/companies apps/seumeiapp/app/api/company-selection apps/seumeiapp/app/api/onboarding
git commit -m "feat(seumei): authorize company http boundaries"
```

### Task 8: Company entry, onboarding and workspace UI

**Files:**
- Modify: `apps/seumeiapp/app/page.tsx`
- Create: `apps/seumeiapp/app/loading.tsx`
- Create: `apps/seumeiapp/app/onboarding/page.tsx`
- Create: `apps/seumeiapp/app/workspace/page.tsx`
- Create: `apps/seumeiapp/src/ui/CompanyEntry.tsx`
- Create: `apps/seumeiapp/src/ui/CompanyEntry.test.tsx`
- Create: `apps/seumeiapp/src/ui/CompanyOnboarding.tsx`
- Create: `apps/seumeiapp/src/ui/CompanyOnboarding.test.tsx`
- Create: `apps/seumeiapp/src/ui/CompanyWorkspace.tsx`
- Create: `apps/seumeiapp/src/ui/CompanyWorkspace.test.tsx`
- Modify: `apps/seumeiapp/src/ui/AuthShell.tsx`
- Modify: `apps/seumeiapp/app/globals.css`
- Remove: `apps/seumeiapp/src/ui/HomeSummary.tsx`
- Remove: `apps/seumeiapp/app/api/home-summary/route.ts`
- Remove: `apps/seumeiapp/src/application/read-home-summary.ts`
- Remove: `apps/seumeiapp/src/application/read-home-summary.test.ts`
- Remove: `apps/seumeiapp/src/infrastructure/establishment-summary.repository.ts`

**Interfaces:**
- Consumes presenter view models only.
- Client mutations use the Task 7 HTTP routes and `router.refresh()`.
- Does not expose tenant IDs to client components.

- [ ] **Step 1: Write failing company-entry component tests**

Cover honest empty state, list of authorized companies, create form accessible labels, submit disabled while pending, conflict recovery and unavailable state. Assert no `tenantId` text/input appears.

- [ ] **Step 2: Verify RED and implement entry UI**

Run: `pnpm --filter @matriz/app-seumei test -- src/ui/CompanyEntry.test.tsx`

Use public MatrizLib components where already exported; keep company-specific composition app-local.

- [ ] **Step 3: Write failing onboarding component tests**

Cover saved-step resume, keyboard navigation, field validation, pending state, stale-version reload action and completion redirect to `/workspace`.

- [ ] **Step 4: Implement onboarding UI and server page**

Render one decision group per step. Preserve focus on the first invalid field. Use `aria-live` for mutation feedback and native form semantics.

- [ ] **Step 5: Write failing workspace component tests**

Assert real company name, operation summary and link to switch company. Assert product/stock/order placeholder cards are absent.

- [ ] **Step 6: Implement workspace and route guards**

Incomplete onboarding redirects to `/onboarding`; missing active selection redirects to `/`; unauthorized selection renders generic denial; unavailable infrastructure renders a 503-style in-page state.

- [ ] **Step 7: Remove superseded establishment-home flow and fake tenant provider**

Remove `TenantProvider` from `AuthShell`; company authority now comes from server composition. Keep login and bootstrap behavior intact.

- [ ] **Step 8: Verify UI GREEN**

Run: `pnpm --filter @matriz/app-seumei test`

Expected: all domain, application, infrastructure and component tests PASS.

- [ ] **Step 9: Commit the vertical UI**

```powershell
git add -A apps/seumeiapp
git commit -m "feat(seumei): deliver company onboarding workspace"
```

### Task 9: Ledger, ownership documentation and manifest truth

**Files:**
- Modify: `docs/seumei-migration-ledger.md`
- Modify: `apps/seumeiapp/docs/AGENT-START-HERE.md`
- Modify: `apps/seumeiapp/README.md`
- Modify: `apps/seumeiapp/src/manifest/manifest.ts`
- Modify: `apps/seumeiapp/src/manifest/manifest.test.ts`

**Interfaces:**
- Manifest adds only capabilities/routes that exist after Task 8.
- Ledger records evidence, data, dependencies, classification, priority, destination, test strategy and actual state for every mapped reference capability.

- [ ] **Step 1: Write a failing manifest expectation**

Assert real routes `/`, `/onboarding`, `/workspace` and capabilities for company read/create/select and onboarding update. Do not add future product/stock/order routes.

- [ ] **Step 2: Verify RED, update manifest and run smoke**

Run:

```powershell
pnpm --filter @matriz/app-seumei test -- src/manifest/manifest.test.ts
pnpm run test:smoke
```

Expected after implementation: focused and public-contract smoke tests PASS.

- [ ] **Step 3: Expand the ledger with evidence-backed rows**

Record P0 implemented states and P1-P3 deferred/rejected states from the spec. Cite exact reference source paths and exact Matriz destination/test paths. Mark no deferred capability as implemented.

- [ ] **Step 4: Update app continuation docs**

Document route flow, correct layer for changes, presenter requirement, Core/Seumei ownership, repository ports, browser validation and next recommended slice: company shell, memberships and permissions.

- [ ] **Step 5: Commit documentation and manifest**

```powershell
git add docs/seumei-migration-ledger.md apps/seumeiapp/docs/AGENT-START-HERE.md apps/seumeiapp/README.md apps/seumeiapp/src/manifest/manifest.ts apps/seumeiapp/src/manifest/manifest.test.ts
git commit -m "docs(seumei): record first assimilated slice"
```

### Task 10: Real database and browser verification

**Files:**
- No tracked files. This task verifies the committed implementation using disposable runtime state.
- Do not commit `.env`, logs, generated clients, screenshots, `.next`, `.turbo` or database volumes.

**Interfaces:**
- Uses disposable local Postgres schemas or an explicitly supplied non-production database.
- Exercises Matriz Hub login and Seumei on ports 3000 and 3008.

- [ ] **Step 1: Inspect available local database/runtime without changing external state**

Check configured environment names without printing secret values. If no safe database exists, start a disposable local Postgres container with task-specific credentials and remove it after verification.

- [ ] **Step 2: Generate clients and apply additive SQL only to disposable schemas**

Apply Core baseline if required and the Seumei migration. Seed two users, two tenants and mutually isolated memberships through repositories or test setup code.

- [ ] **Step 3: Run focused integration tests**

Prove tenant A cannot read/update company B even with company B's ID and onboarding version. Re-run after process restart.

- [ ] **Step 4: Run the app and Hub in real browser**

Validate:

1. login and redirect;
2. no-company state;
3. company creation and owner membership;
4. selection among authorized companies only;
5. onboarding save, refresh and resume;
6. completion and workspace entry;
7. refresh and later session;
8. foreign known ID denial;
9. desktop and mobile viewports;
10. keyboard order, focus, console errors and horizontal overflow.

- [ ] **Step 5: Run scoped gates consecutively**

```powershell
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei lint
pnpm --filter @matriz/app-seumei typecheck
pnpm --filter @matriz/app-seumei build
pnpm run test:smoke
pnpm run prisma:validate
```

- [ ] **Step 6: Run global impact gates**

```powershell
pnpm run typecheck
pnpm run lint
pnpm run build
```

Run the repository boundary test command discovered in root scripts/tests. Record exact command and result in the delivery report.

- [ ] **Step 7: Inspect the committed tree and working tree**

```powershell
git diff --check
git status --short
git ls-files | rg "(^|/)(\.env($|\.)|\.next/|\.turbo/|node_modules/)|\.(log|png)$"
```

Confirm no incoming-reference file is staged and no unrelated app change is included.

- [ ] **Step 8: Preserve verification evidence for the final report**

Record exact commands, exit codes, browser scenarios, viewports and any remaining limitation. Do not create a tracked verification artifact solely to report transient output.
