# Seumei Tenant Hub Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a trusted multi-company Seumei Hub and reusable authenticated shell with isolated fixtures, membership authorization, installed-app routing, and responsive high-fidelity UI.

**Architecture:** Keep all Seumei business concepts app-local in bounded modules. Authenticate with the shared platform, resolve company access through app-local memberships into an immutable tenant context, and pass that context to repositories and application services. Render only presenter-produced view models and compose existing MatrizLib primitives inside a Seumei-specific shell.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.6, Vitest, Testing Library, MatrizLib (`@matriz/design-ui`, `@matriz/design-system`), shared Matriz authentication and storage.

**Spec:** `docs/superpowers/specs/2026-08-24-seumei-tenant-hub-foundation-design.md`

## Global Constraints

- Work inside `apps/seumei` except for the scoped dependency lock update required by its package manifest.
- Never import another app's `src/**` or `app/**`.
- Keep Company, Membership, InstalledApp, authorization rules, fixtures, presenters, and shell compositions app-local.
- Never authorize from a component-provided company id or slug alone.
- Tenant-owned repositories consume a resolved `SeumeiTenantContext`.
- UI consumes view models, not domain entities.
- Galáxia Burger and Matriz Labs data come from fixtures; feature code contains no tenant-name conditionals.
- User appearance, company branding, and future store appearance remain separate.
- Critical shell navigation must work with pointer, focus, keyboard, explicit toggles, touch, and reduced motion.
- Preserve the accepted login experience.
- Do not change root tooling, workspace configuration, or unrelated apps.

---

### Task 1: Establish a trustworthy isolated validation baseline

**Files:**
- Update checkpoint: `docs/superpowers/plans/2026-08-24-seumei-tenant-hub-foundation.md`

**Interfaces:**
- Consumes: workspace React 19.2 type contracts.
- Produces: evidence that the canonical workspace runtime validates Seumei.

- [x] **Step 1: Reproduce and capture the current failure**

```powershell
pnpm --filter @matriz/app-seumei typecheck
```

Observed outside the worktree: `pnpm 11` ignored workspace overrides and produced incompatible React type identities.

- [x] **Step 2: Select the package-manager version declared by the repository**

```powershell
corepack pnpm --version
```

Observed: `9.12.0`.

- [x] **Step 3: Install the isolated worktree without changing the lockfile**

```powershell
corepack pnpm install --frozen-lockfile
```

- [x] **Step 4: Verify the scoped baseline**

```powershell
pnpm --filter @matriz/app-seumei typecheck
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei lint
```

Observed: 3 tests passed; typecheck and lint exited successfully.

- [x] **Step 5: Record the environmental root cause without changing dependencies**

No package or lockfile repair is needed. All subsequent commands use
`corepack pnpm` so the repository selects `pnpm 9.12.0`.

### Task 2: Define bounded company, membership, application, and preference models

**Files:**
- Create: `apps/seumei/src/domains/companies/domain/company.ts`
- Create: `apps/seumei/src/domains/memberships/domain/membership.ts`
- Create: `apps/seumei/src/domains/memberships/domain/tenant-context.ts`
- Create: `apps/seumei/src/domains/apps/domain/app.ts`
- Create: `apps/seumei/src/domains/preferences/domain/appearance.ts`
- Test: `apps/seumei/src/domains/memberships/domain/tenant-context.test.ts`

**Interfaces:**
- Consumes: `UserId` and `TenantId` from `@matriz/foundation-types`.
- Produces: `Company`, `Membership`, `SeumeiTenantContext`, `SeumeiAppDefinition`, `InstalledApp`, and `UserAppearancePreference`.

- [x] **Step 1: Write the failing tenant-context invariant tests**

```ts
import { describe, expect, it } from "vitest"
import { createTenantContext } from "./tenant-context"

describe("createTenantContext", () => {
  it("rejects a membership bound to another company", () => {
    expect(() => createTenantContext({
      userId: "user-tai" as never,
      companyId: "company-galaxia" as never,
      membership: {
        id: "membership-tai-matriz" as never,
        userId: "user-tai" as never,
        companyId: "company-matriz" as never,
        role: "admin",
        status: "active",
        permissions: ["apps.view"],
      },
    })).toThrow("membership-company-mismatch")
  })
})
```

- [x] **Step 2: Run the focused test and confirm failure**

```powershell
pnpm --filter @matriz/app-seumei test -- src/domains/memberships/domain/tenant-context.test.ts
```

Expected: failure because the module does not exist.

- [x] **Step 3: Implement focused domain contracts and invariants**

Core signatures:

```ts
export type CompanyId = TenantId & { readonly __company: unique symbol }
export type MembershipId = string & { readonly __membership: unique symbol }
export type MembershipRole = "owner" | "admin" | "member" | "guest"
export type SeumeiPermission =
  | "company.view" | "company.manage" | "apps.view" | "apps.manage"
  | "crm.view" | "products.view" | "orders.view" | "inventory.view"
  | "finance.view" | "store.view" | "reports.view"

export interface SeumeiTenantContext {
  readonly userId: UserId
  readonly companyId: CompanyId
  readonly membershipId: MembershipId
  readonly role: MembershipRole
  readonly permissions: readonly SeumeiPermission[]
}
```

`createTenantContext` must reject inactive, user-mismatched, or company-mismatched memberships.

- [x] **Step 4: Run the model tests and typecheck**

```powershell
pnpm --filter @matriz/app-seumei test -- src/domains/memberships/domain/tenant-context.test.ts
pnpm --filter @matriz/app-seumei typecheck
```

- [x] **Step 5: Commit the domain foundation**

```powershell
git add apps/seumei/src/domains
git commit -m "feat(seumei): define tenant foundation models"
```

### Task 3: Implement independent fixtures, repositories, and tenant resolution

**Files:**
- Create: `apps/seumei/src/fixtures/companies.ts`
- Create: `apps/seumei/src/fixtures/memberships.ts`
- Create: `apps/seumei/src/fixtures/installed-apps.ts`
- Create: `apps/seumei/src/fixtures/preferences.ts`
- Create: `apps/seumei/src/domains/companies/domain/company.repository.ts`
- Create: `apps/seumei/src/domains/memberships/domain/membership.repository.ts`
- Create: `apps/seumei/src/domains/apps/domain/installed-app.repository.ts`
- Create: `apps/seumei/src/mock/business-os.repositories.ts`
- Create: `apps/seumei/src/domains/memberships/application/resolve-tenant-context.ts`
- Test: `apps/seumei/src/mock/business-os.repositories.test.ts`
- Test: `apps/seumei/src/domains/memberships/application/resolve-tenant-context.test.ts`

**Interfaces:**
- Consumes: models from Task 2 and authenticated `UserId`.
- Produces: repository contracts, `createBusinessOsRepositories()`, and `resolveTenantContext(input)` returning a typed result.

- [x] **Step 1: Write cross-tenant isolation tests**

```ts
it("never returns Matriz Labs apps in a Galáxia Burger context", async () => {
  const repos = createBusinessOsRepositories()
  const context = await resolveFixtureContext(repos, "user-tai", "company-galaxia")
  const apps = await repos.installedApps.list(context)
  expect(apps.every((app) => app.companyId === context.companyId)).toBe(true)
  expect(apps.map((app) => app.appId)).not.toContain("reports")
})

it("rejects a company with no membership", async () => {
  const result = await resolveTenantContext({
    userId: "user-outsider" as never,
    requestedCompanyId: "company-galaxia" as never,
    memberships: createBusinessOsRepositories().memberships,
  })
  expect(result).toEqual({ ok: false, error: "membership-required" })
})
```

- [x] **Step 2: Run focused tests and confirm failure**

```powershell
pnpm --filter @matriz/app-seumei test -- src/mock/business-os.repositories.test.ts src/domains/memberships/application/resolve-tenant-context.test.ts
```

- [x] **Step 3: Implement fixture-backed repositories with private global collections**

Repository contracts must expose only scoped methods:

```ts
export interface MembershipRepository {
  listForUser(userId: UserId): Promise<readonly Membership[]>
  findActive(userId: UserId, companyId: CompanyId): Promise<Membership | null>
}

export interface InstalledAppRepository {
  list(context: SeumeiTenantContext): Promise<readonly InstalledApp[]>
  find(context: SeumeiTenantContext, appId: SeumeiAppId): Promise<InstalledApp | null>
}
```

Galáxia Burger and Matriz Labs must have distinct ids, branding objects, membership ids, and installed-app rows.

- [x] **Step 4: Implement fail-closed tenant resolution**

```ts
export type TenantResolution =
  | { readonly ok: true; readonly context: SeumeiTenantContext }
  | { readonly ok: false; readonly error: "membership-required" | "membership-disabled" }
```

The resolver loads membership by authenticated user plus requested company, then constructs the context through Task 2 invariants.

- [x] **Step 5: Run isolation tests, full tests, and typecheck**

```powershell
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei typecheck
```

- [x] **Step 6: Commit repositories and fixtures**

```powershell
git add apps/seumei/src/fixtures apps/seumei/src/mock apps/seumei/src/domains
git commit -m "feat(seumei): isolate company fixture repositories"
```

### Task 4: Add the internal application registry and centralized access policy

**Files:**
- Create: `apps/seumei/src/domains/apps/application/app-registry.ts`
- Create: `apps/seumei/src/domains/apps/application/app-access.policy.ts`
- Test: `apps/seumei/src/domains/apps/application/app-access.policy.test.ts`

**Interfaces:**
- Consumes: `SeumeiAppDefinition`, `InstalledApp`, `SeumeiTenantContext`.
- Produces: `SEUMEI_APP_REGISTRY`, `findAppDefinition`, and `authorizeAppAccess`.

- [ ] **Step 1: Write failing install-plus-permission policy tests**

```ts
it("requires an app to be installed and permitted", () => {
  expect(authorizeAppAccess({ context, definition: products, installed: null }))
    .toEqual({ ok: false, error: "app-not-installed" })
  expect(authorizeAppAccess({ context: guestContext, definition: products, installed: productInstall }))
    .toEqual({ ok: false, error: "permission-denied" })
})
```

- [ ] **Step 2: Run the test and confirm failure**

```powershell
pnpm --filter @matriz/app-seumei test -- src/domains/apps/application/app-access.policy.test.ts
```

- [ ] **Step 3: Implement the typed registry and policy**

Registry entries define id, label, description, icon key, route segment, required permission, navigation, and optional commands. The policy checks installation status before permission and never reads roles directly.

- [ ] **Step 4: Run tests and typecheck**

```powershell
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei typecheck
```

- [ ] **Step 5: Commit the registry**

```powershell
git add apps/seumei/src/domains/apps
git commit -m "feat(seumei): add authorized capability registry"
```

### Task 5: Build the Hub application service and presenter boundary

**Files:**
- Create: `apps/seumei/src/domains/hub/application/hub.service.ts`
- Create: `apps/seumei/src/domains/hub/presentation/hub.presenter.ts`
- Create: `apps/seumei/src/domains/hub/presentation/hub.presenter.test.ts`
- Modify: `apps/seumei/src/lib/container.ts`

**Interfaces:**
- Consumes: repositories, tenant resolver, app registry, and access policy.
- Produces: `BusinessOsService.listCompanies(userId)`, `BusinessOsService.openCompany(userId, companyId)`, and `HubViewModel`.

- [ ] **Step 1: Write the failing coherent Hub view-model test**

```ts
it("presents each company with only its authorized installed apps", async () => {
  const service = createBusinessOsService(createBusinessOsRepositories())
  const model = await service.getHub("user-tai" as never)
  const galaxia = model.companies.find((company) => company.slug === "galaxia-burger")!
  const matriz = model.companies.find((company) => company.slug === "matriz-labs")!
  expect(galaxia.apps.map((app) => app.id)).toContain("store")
  expect(matriz.apps.map((app) => app.id)).not.toContain("store")
})
```

- [ ] **Step 2: Run the test and confirm failure**

```powershell
pnpm --filter @matriz/app-seumei test -- src/domains/hub/presentation/hub.presenter.test.ts
```

- [ ] **Step 3: Implement service orchestration and presenter-only UI models**

`HubViewModel` contains formatted names, role labels, status labels, branding asset paths, app cards, primary hrefs, and recent-state labels. It contains no domain entities.

- [ ] **Step 4: Extend the app-local container without removing legacy use cases**

```ts
export interface SeumeiContainer {
  readonly useCases: SeumeiUseCases
  readonly businessOs: BusinessOsService
  readonly gateways: { readonly contracts: SeumeiContractsGateway }
}
```

- [ ] **Step 5: Run tests, typecheck, and lint**

```powershell
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei typecheck
pnpm --filter @matriz/app-seumei lint
```

- [ ] **Step 6: Commit the application layer**

```powershell
git add apps/seumei/src/domains/hub apps/seumei/src/lib/container.ts
git commit -m "feat(seumei): compose tenant-aware hub service"
```

### Task 6: Implement authenticated tenant state, company switching, and routes

**Files:**
- Create: `apps/seumei/src/domains/memberships/presentation/SeumeiTenantProvider.tsx`
- Create: `apps/seumei/src/domains/memberships/presentation/use-seumei-tenant.ts`
- Create: `apps/seumei/src/domains/login/presentation/SeumeiDemoAccess.tsx`
- Create: `apps/seumei/src/domains/login/presentation/SeumeiDemoAccess.test.tsx`
- Create: `apps/seumei/src/domains/hub/presentation/HubScreen.tsx`
- Create: `apps/seumei/app/hub/page.tsx`
- Create: `apps/seumei/app/c/[companySlug]/page.tsx`
- Create: `apps/seumei/app/c/[companySlug]/apps/[appId]/page.tsx`
- Modify: `apps/seumei/app/page.tsx`
- Modify: `apps/seumei/src/auth/provider.tsx`
- Test: `apps/seumei/src/domains/memberships/presentation/SeumeiTenantProvider.test.tsx`

**Interfaces:**
- Consumes: authenticated `AuthSession`, `BusinessOsService`, and `HubViewModel`.
- Produces: `SeumeiTenantState` with `current`, `companies`, `switchCompany`, and typed error state.

- [ ] **Step 1: Write failing safe-switch tests**

```tsx
it("keeps the valid company when an invalid switch is requested", async () => {
  renderTenantHarness()
  await user.click(screen.getByRole("button", { name: /galáxia burger/i }))
  await act(() => tenantApi.switchCompany("company-unknown" as never))
  expect(screen.getByText("Galáxia Burger")).toBeInTheDocument()
  expect(screen.getByRole("alert")).toHaveTextContent("empresa não disponível")
})
```

- [ ] **Step 2: Run the focused test and confirm failure**

```powershell
pnpm --filter @matriz/app-seumei test -- src/domains/memberships/presentation/SeumeiTenantProvider.test.tsx
```

- [ ] **Step 3: Implement the provider using authenticated user id as authority**

The selected company is restored from an app-local storage key scoped by user id, revalidated against memberships at startup, and replaced only after successful resolution. Appearance uses a separate user-scoped key.

- [ ] **Step 4: Write and verify the failing demo-access test**

```tsx
it("authenticates the canonical demo account through the broker", async () => {
  renderDemoAccess()
  await user.click(screen.getByRole("button", { name: /entrar no modo demo/i }))
  expect(broker.signInWithEmail).toHaveBeenCalledWith("demo@seumei.local")
  expect(acceptSession).toHaveBeenCalledTimes(1)
})
```

Run it before implementation:

```powershell
corepack pnpm --filter @matriz/app-seumei test -- src/domains/login/presentation/SeumeiDemoAccess.test.tsx
```

Implement `SeumeiDemoAccess` as a Seumei-local `panelSupplement` for the
accepted shared login flow. It calls the normal broker, accepts the returned
session, records the Seumei app open, and contains no membership or repository
bypass.

- [ ] **Step 5: Implement authorized routes and Hub screen**

`/` redirects to `/hub`. Dynamic company/app routes resolve slug and app id through the application service; unknown or unauthorized values render a safe unavailable state without fixture details.

- [ ] **Step 6: Run tests, typecheck, and lint**

```powershell
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei typecheck
pnpm --filter @matriz/app-seumei lint
```

- [ ] **Step 7: Commit tenant navigation and demo access**

```powershell
git add apps/seumei/app apps/seumei/src/auth apps/seumei/src/domains
git commit -m "feat(seumei): add safe company hub navigation"
```

### Task 7: Implement the intelligent shared shell and high-fidelity Hub styling

**Files:**
- Create: `apps/seumei/src/ui/shell/SeumeiShell.tsx`
- Create: `apps/seumei/src/ui/shell/SmartTopbar.tsx`
- Create: `apps/seumei/src/ui/shell/ContextSidebar.tsx`
- Create: `apps/seumei/src/ui/shell/AppSwitcher.tsx`
- Create: `apps/seumei/src/ui/shell/shell.types.ts`
- Create: `apps/seumei/src/ui/shell/SeumeiShell.test.tsx`
- Create: `apps/seumei/src/ui/styles/seumei-shell.css`
- Create: `apps/seumei/src/ui/styles/seumei-hub.css`
- Modify: `apps/seumei/src/ui/components/AppShell.tsx`
- Modify: `apps/seumei/app/globals.css`
- Modify: `apps/seumei/app/layout.tsx`

**Interfaces:**
- Consumes: shell view models and MatrizLib public primitives.
- Produces: one reusable shell accepting `company`, `activeApp`, `navigation`, `apps`, `contextActions`, and `children`.

- [ ] **Step 1: Write failing keyboard and explicit-toggle interaction tests**

```tsx
it("reveals contextual navigation without hover", async () => {
  render(<SeumeiShell {...fixtureProps} />)
  await user.click(screen.getByRole("button", { name: /expandir navegação/i }))
  expect(screen.getByRole("navigation", { name: /aplicação atual/i }))
    .toHaveAttribute("data-expanded", "true")
})

it("keeps app switching available to keyboard users", async () => {
  render(<SeumeiShell {...fixtureProps} />)
  await user.tab()
  await user.keyboard("{Enter}")
  expect(screen.getByRole("dialog", { name: /aplicativos seumei/i })).toBeVisible()
})
```

- [ ] **Step 2: Run the focused shell test and confirm failure**

```powershell
pnpm --filter @matriz/app-seumei test -- src/ui/shell/SeumeiShell.test.tsx
```

- [ ] **Step 3: Implement shell contracts and interaction state**

Use explicit buttons as the authoritative control. Pointer proximity and
`focus-within` enhance reveal. Escape closes transient panels and focus returns
to their triggers. No domain repository is imported into shell components.

- [ ] **Step 4: Implement Seumei visual tokens and responsive geometry**

Use dark graphite surfaces, precise one-pixel borders, compact type, purple
accent, 52–60px topbar geometry, compact/expanded sidebar states, dense cards,
and reference-matched spacing. Add media queries for smaller desktop, tablet,
and mobile, plus `@media (prefers-reduced-motion: reduce)` overrides.

- [ ] **Step 5: Replace the legacy static AppShell with the shared shell adapter**

Keep the public `AppShell({ children })` compatibility while routing new Hub
surfaces through `SeumeiShell`. Remove the extra static session bar because
account access belongs inside the topbar.

- [ ] **Step 6: Run component and scoped validations**

```powershell
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei typecheck
pnpm --filter @matriz/app-seumei lint
```

- [ ] **Step 7: Commit the shell**

```powershell
git add apps/seumei/app apps/seumei/src/ui apps/seumei/src/auth/provider.tsx
git commit -m "feat(seumei): build intelligent authenticated shell"
```

### Task 8: Validate the complete slice and correct visual deviations

**Files:**
- Modify: `apps/seumei/src/ui/styles/seumei-shell.css`
- Modify: `apps/seumei/src/ui/styles/seumei-hub.css`
- Modify: `apps/seumei/src/ui/shell/SmartTopbar.tsx`
- Modify: `apps/seumei/src/ui/shell/ContextSidebar.tsx`
- Modify: `apps/seumei/src/domains/hub/presentation/HubScreen.tsx`
- Modify: `apps/seumei/src/ui/shell/SeumeiShell.test.tsx`
- Update checkpoints: `docs/superpowers/plans/2026-08-24-seumei-tenant-hub-foundation.md`

**Interfaces:**
- Consumes: completed Tasks 1–7.
- Produces: verified authenticated Hub and tenant-safe shell.

- [ ] **Step 1: Run the complete scoped automated suite**

```powershell
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei typecheck
pnpm --filter @matriz/app-seumei lint
```

Expected: all commands exit successfully with no ignored failures.

- [ ] **Step 2: Start Hub authentication and Seumei**

```powershell
pnpm --filter @matriz/app-matriz-hub dev
pnpm --filter @matriz/app-seumei dev
```

Authenticate through the accepted login, then open `/hub`.

- [ ] **Step 3: Verify the functional scenario**

Confirm that Tai sees Galáxia Burger and Matriz Labs; Galáxia includes Store;
Matriz Labs does not; company switching updates branding and app lists; direct
unauthorized app navigation fails closed; appearance selection survives switching.

- [ ] **Step 4: Inspect the reference geometry at four widths**

Capture and compare:

```text
1440x900 desktop
1180x820 smaller desktop
768x1024 tablet
390x844 mobile
```

Review topbar height, sidebar proportions, company cards, app tiles, type scale,
spacing, borders, contrast, focus states, overflow, and explicit navigation controls.

- [ ] **Step 5: Apply the visual correction checklist**

Set the desktop topbar to 56px, compact sidebar to 72px, expanded sidebar to
232px, content gutter to 24px, card border to one semantic pixel, and Hub content
maximum to 1180px. Remove horizontal overflow at all four target widths. Ensure
company branding remains visible in compact navigation, focus rings have at
least 2px visible contrast, and transient controls remain open while focused.
Add a focused interaction assertion to `SeumeiShell.test.tsx` for any behavioral
defect found, run that test, and then repeat the four screenshots.

- [ ] **Step 6: Run final validation after corrections**

```powershell
pnpm --filter @matriz/app-seumei test
pnpm --filter @matriz/app-seumei typecheck
pnpm --filter @matriz/app-seumei lint
git diff --check
```

- [ ] **Step 7: Commit the verified slice**

```powershell
git add apps/seumei docs/superpowers/plans/2026-08-24-seumei-tenant-hub-foundation.md pnpm-lock.yaml
git commit -m "feat(seumei): complete tenant-safe business os hub"
```

## Plan Self-Review Record

- Every spec requirement in this slice maps to Tasks 1–8.
- Domain ownership stays inside Seumei; no shared package is introduced.
- Tenant resolution precedes repository access and route authorization.
- Fixture independence is exercised by repository, service, and UI tests.
- The legacy establishment flow remains available and unmodified until the shell adapter step.
- Automated validation and real visual inspection are both required before completion.
