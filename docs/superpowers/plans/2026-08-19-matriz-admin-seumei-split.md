# Matriz Admin and Seumei Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the current Seumei web/native product to Matriz Admin and add a permanent, minimal Seumei app with Hub login and a real tenant-scoped establishment summary.

**Architecture:** `apps/matriz-admin` preserves the current operator experience and Tauri shell under a new public identity. `apps/seumeiapp` owns public identity `seumei`, authenticates through the Hub broker, derives tenant context server-side from the Hub session cookie, and reads the existing Seumei datasource through an app-local application port backed by `@matriz/platform-db/seumei`. The incoming project remains a read-only migration reference.

**Tech Stack:** pnpm workspace, Next.js 16 App Router, React 19, TypeScript strict, Vitest, Prisma 5, MatrizLib, Matriz auth broker, Tauri 2/Rust, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-19-matriz-admin-seumei-split-design.md`

## Global Constraints

- `apps/matriz-admin` has public `appId: "matriz-admin"`, package `@matriz/app-matriz-admin`, and web port `3002`.
- `apps/seumeiapp` has public `appId: "seumei"`, package `@matriz/app-seumei`, and web port `3008`; port `3007` remains MatrizLib.
- `prisma/schemas/seumei.prisma` and `SEUMEI_DATABASE_URL` remain the single Seumei datasource.
- Matriz Admin must not import `apps/seumeiapp/src/**`; shared business reality crosses a versioned DTO/gateway boundary.
- Every Seumei data read derives `tenantId` from an authenticated Hub session; the browser never selects an arbitrary tenant for the API.
- `C:\Apps\matriz-infra-hub\apps\incoming\seumei-reference` remains outside the workspace dependency graph and is not bulk-copied or committed in this delivery.
- The current native shell becomes Matriz Admin Desktop; the new Seumei remains web-only.
- Use existing Matriz auth, MatrizLib, themes, registry, events, and platform DB infrastructure; create no competing system.
- Do not commit `.env`, database credentials, installers, `dist`, `.next`, `.turbo`, `target`, logs, or the incoming reference tree.

---

### Task 1: Register the two product identities in shared contracts

**Files:**
- Modify: `packages/foundation/constants/src/index.ts`
- Modify: `packages/integration/api-contracts/src/v1/onboarding.ts`
- Modify: `packages/platform/config/src/index.ts`
- Modify: `packages/design/system/src/themes.ts`
- Modify: `packages/access/tenants/src/index.ts`
- Modify: `packages/platform/auth/src/v1/strategies/otp.strategy.ts`
- Modify: `packages/platform/auth/src/v1/strategies/magic-link.strategy.ts`
- Modify: `packages/platform/auth/src/v1/mappers/session-snapshot.mapper.ts`
- Test: `tests/smoke/dtos.test.ts`
- Test: `tests/smoke/auth-strategies.test.ts`
- Test: `tests/smoke/design-theme-contract.test.ts`

**Interfaces:**
- Consumes: existing `MATRIZ_APP_IDS`, `MatrizAppId`, `appOnboardingPayloadSchemas`, `monorepoConfig.baseUrls`, and `appThemes` records.
- Produces: `MatrizAppId` accepting both `"matriz-admin"` and `"seumei"`; `baseUrls["matriz-admin"] === "http://localhost:3002"`; `baseUrls.seumei === "http://localhost:3008"`.

- [ ] **Step 1: Write failing shared identity tests**

Add assertions equivalent to:

```ts
expect(appIdSchema.parse("matriz-admin")).toBe("matriz-admin")
expect(monorepoConfig.baseUrls["matriz-admin"]).toBe("http://localhost:3002")
expect(monorepoConfig.baseUrls.seumei).toBe("http://localhost:3008")
expect(appThemes["matriz-admin"].label).toBe("Matriz Admin")
```

Extend the OTP and magic-link expectations so the default mock identity grants both `matriz-admin` and `seumei` where the demo tenant enables them.

- [ ] **Step 2: Run the focused tests and witness RED**

Run:

```powershell
corepack pnpm vitest run --config vitest.config.ts tests/smoke/dtos.test.ts tests/smoke/auth-strategies.test.ts tests/smoke/design-theme-contract.test.ts
```

Expected: failure because `matriz-admin` is not a known app and Seumei still points to port 3002.

- [ ] **Step 3: Add the stable identity records**

Insert `"matriz-admin"` into `MATRIZ_APP_IDS` and `MATRIZ_APP_NAMES`; add an empty Matriz Admin onboarding schema; give Matriz Admin its own neutral/violet admin theme in light and dark maps; include it in the base theme compatibility list. Move the Seumei URL to 3008 and add the Admin URL at 3002. Enable both apps for `tenant_demo`, while preserving existing tenant-specific choices.

The final constants must have the shape:

```ts
export const MATRIZ_APP_IDS = [
  "matriz-hub",
  "matriz-desktop",
  "matrizlib",
  "matriz-workbench",
  "sites",
  "spot",
  "matriz-admin",
  "seumei",
  "contracts",
  "willdash",
] as const
```

- [ ] **Step 4: Run focused typechecks and tests**

Run:

```powershell
corepack pnpm --filter @matriz/foundation-constants typecheck
corepack pnpm --filter @matriz/integration-api-contracts typecheck
corepack pnpm --filter @matriz/design-system typecheck
corepack pnpm vitest run --config vitest.config.ts tests/smoke/dtos.test.ts tests/smoke/auth-strategies.test.ts tests/smoke/design-theme-contract.test.ts
```

Expected: all exit 0.

- [ ] **Step 5: Commit shared identity support**

```powershell
git add packages/foundation/constants packages/integration/api-contracts/src/v1/onboarding.ts packages/platform/config/src/index.ts packages/design/system/src/themes.ts packages/access/tenants/src/index.ts packages/platform/auth/src/v1 tests/smoke
git commit -m "feat(platform): register matriz admin identity"
```

---

### Task 2: Rename the current web and native Seumei delivery to Matriz Admin

**Files:**
- Move: `apps/seumei/**` -> `apps/matriz-admin/**`
- Modify after move: `apps/matriz-admin/package.json`
- Modify after move: `apps/matriz-admin/src/manifest/manifest.ts`
- Modify after move: `apps/matriz-admin/src/bootstrap/index.ts`
- Modify after move: `apps/matriz-admin/src/auth/**`
- Modify after move: `apps/matriz-admin/app/**`
- Modify after move: `apps/matriz-admin/desktop/**`
- Modify after move: `apps/matriz-admin/public-contract.ts`
- Test after move: `apps/matriz-admin/src/manifest/manifest.test.ts`
- Test after move: `apps/matriz-admin/desktop/src/app.test.tsx`
- Test after move: existing moved unit and contract tests

**Interfaces:**
- Consumes: shared `MatrizAppId` and theme entry from Task 1.
- Produces: `manifest.appId === "matriz-admin"`; package `@matriz/app-matriz-admin`; Tauri product `Matriz Admin`, identifier `com.matriz.admin`, binary `matriz-admin-desktop.exe`, current-user NSIS installer.

- [ ] **Step 1: Add failing identity tests before moving**

Create a manifest test that expects:

```ts
expect(manifest).toMatchObject({
  appId: "matriz-admin",
  name: "Matriz Admin",
  primaryRoute: "/",
})
expect(manifest.eventsProduced).not.toContain("seumei.establishment.selected")
```

Update the desktop render test to expect `MATRIZ ADMIN / DESKTOP` and accessible product name `Matriz Admin`.

- [ ] **Step 2: Run the app tests and witness RED**

```powershell
corepack pnpm --filter @matriz/app-seumei test
```

Expected: the new identity assertions fail against the current Seumei branding.

- [ ] **Step 3: Move the directory with Git history**

Use `git mv apps/seumei apps/matriz-admin`. Do not copy the directory. Rename symbols and files only where the old product identity is encoded; domain nouns such as `Establishment` remain because the Admin still displays the transitional screens.

- [ ] **Step 4: Rename package, manifest, bootstrap, auth, and UI identity**

Set package name and scripts:

```json
{
  "name": "@matriz/app-matriz-admin",
  "scripts": {
    "dev": "next dev -p 3002",
    "start": "next start -p 3002"
  }
}
```

Rename public functions to `bootstrapMatrizAdmin`, `getMatrizAdminTelemetry`, and `requireMatrizAdminSession`. The bootstrap registers only `matriz-admin`; it must not register Seumei onboarding or subscribe as producer of `seumei.establishment.selected`. Update metadata, login skin, AppShell labels, CSS selectors, storage namespace, README, and AGENT instructions.

- [ ] **Step 5: Rename the native delivery**

Set Tauri configuration and Cargo package to:

```json
{
  "productName": "Matriz Admin",
  "identifier": "com.matriz.admin"
}
```

Use executable `matriz-admin-desktop.exe`, installer product `Matriz Admin`, storage namespace `matriz-admin-desktop:v1`, and UI footer `MATRIZ ADMIN / DESKTOP`. Preserve domain composition and local persistence behavior.

- [ ] **Step 6: Run renamed app gates**

```powershell
corepack pnpm --filter @matriz/app-matriz-admin test
corepack pnpm --filter @matriz/app-matriz-admin typecheck
corepack pnpm --filter @matriz/app-matriz-admin lint
corepack pnpm --filter @matriz/app-matriz-admin build
$env:CARGO_INCREMENTAL='0'; $env:CARGO_PROFILE_DEV_DEBUG='0'; cargo test --manifest-path apps/matriz-admin/desktop/src-tauri/Cargo.toml
```

Expected: all exit 0 and no file under `apps/seumei` remains.

- [ ] **Step 7: Commit the product rename**

```powershell
git add apps/matriz-admin apps/seumei
git commit -m "refactor(seumei): rename current product to matriz admin"
```

---

### Task 3: Create the permanent minimal Seumei app

**Files:**
- Create: `apps/seumeiapp/package.json`
- Create: `apps/seumeiapp/tsconfig.json`
- Create: `apps/seumeiapp/next.config.mjs`
- Create: `apps/seumeiapp/next-env.d.ts`
- Create: `apps/seumeiapp/vitest.config.ts`
- Create: `apps/seumeiapp/public-contract.ts`
- Create: `apps/seumeiapp/README.md`
- Create: `apps/seumeiapp/AGENTS.md`
- Create: `apps/seumeiapp/docs/AGENT-START-HERE.md`
- Create: `apps/seumeiapp/src/manifest/manifest.ts`
- Create: `apps/seumeiapp/src/bootstrap/index.ts`
- Create: `apps/seumeiapp/src/auth/config.ts`
- Create: `apps/seumeiapp/src/auth/provider.tsx`
- Create: `apps/seumeiapp/src/domains/login/presentation/LoginScreen.tsx`
- Create: `apps/seumeiapp/src/application/read-home-summary.ts`
- Create: `apps/seumeiapp/src/integration/gateways/hub-session.gateway.ts`
- Create: `apps/seumeiapp/src/integration/repositories/prisma-establishment-summary.repository.ts`
- Create: `apps/seumeiapp/src/ui/presenters/home-summary.presenter.ts`
- Create: `apps/seumeiapp/src/ui/components/HomeSummary.tsx`
- Create: `apps/seumeiapp/app/api/home-summary/route.ts`
- Create: `apps/seumeiapp/app/login/page.tsx`
- Create: `apps/seumeiapp/app/page.tsx`
- Create: `apps/seumeiapp/app/layout.tsx`
- Create: `apps/seumeiapp/app/globals.css`
- Test: `apps/seumeiapp/src/application/read-home-summary.test.ts`
- Test: `apps/seumeiapp/app/api/home-summary/route.test.ts`
- Test: `apps/seumeiapp/src/ui/components/HomeSummary.test.tsx`

**Interfaces:**
- Consumes: `MockAuthBroker` semantics through Hub HTTP endpoints, `AuthSession`, `makeEstablishmentRepo(getSeumeiDb())`, MatrizLib public exports, `appThemes.seumei`.
- Produces: `readHomeSummary(context, repository): Promise<SeumeiHomeSummary>` and authenticated `GET /api/home-summary` returning `{ tenantId, establishmentCount, firstEstablishment }`.

- [ ] **Step 1: Create the minimal test harness and write the application-service tests**

Create `package.json`, `tsconfig.json`, and `vitest.config.ts` first so the
workspace filter exists. The package is named `@matriz/app-seumei`; its test
script is `vitest run --config vitest.config.ts`. Then create the application
test without its implementation.

Define these exact ports:

```ts
export interface SeumeiRequestContext {
  readonly tenantId: string
  readonly tenantName: string
  readonly userName: string
}

export interface EstablishmentSummaryRepository {
  listByTenant(tenantId: string): Promise<readonly {
    id: string
    name: string
    city: string
    status: string
  }[]>
}

export interface SeumeiHomeSummary {
  readonly tenantId: string
  readonly tenantName: string
  readonly establishmentCount: number
  readonly firstEstablishment: null | {
    readonly id: string
    readonly name: string
    readonly city: string
    readonly status: string
  }
}
```

Test that `readHomeSummary` calls `listByTenant("tenant_demo")`, returns zero/null for an empty tenant, and throws `MissingTenantContextError` for an empty tenant ID.

- [ ] **Step 2: Run the application test and witness RED**

```powershell
corepack pnpm --filter @matriz/app-seumei test -- src/application/read-home-summary.test.ts
```

Expected: failure because the new package/service does not exist.

- [ ] **Step 3: Scaffold the app and implement the minimal service**

Create package `@matriz/app-seumei` using Next 16.2.4 and port 3008. Implement `readHomeSummary` as a small application function that validates `context.tenantId.trim()` and passes only that value to the repository.

- [ ] **Step 4: Implement the Hub session gateway and secure API route tests**

The gateway interface is:

```ts
export interface HubSessionGateway {
  getRequestContext(cookieHeader: string | null): Promise<SeumeiRequestContext | null>
}
```

The HTTP implementation calls `${monorepoConfig.baseUrls["matriz-hub"]}/api/auth/mock/session` with `Cookie` forwarded and `cache: "no-store"`; it maps the active tenant from the returned shared session. The API test must prove:

```ts
expect(await GET(requestWithoutCookie)).toHaveProperty("status", 401)
expect(repository.listByTenant).toHaveBeenCalledWith("tenant_demo")
expect(repository.listByTenant).not.toHaveBeenCalledWith("tenant_from_query")
```

Expose a route factory `createHomeSummaryRoute({ sessionGateway, repository })` for deterministic tests; the exported `GET` composes real adapters.

- [ ] **Step 5: Implement the Prisma summary adapter**

Compose the existing platform repository:

```ts
const db = getSeumeiDb()
const establishments = makeEstablishmentRepo(db)

export const prismaEstablishmentSummaryRepository: EstablishmentSummaryRepository = {
  async listByTenant(tenantId) {
    const rows = await establishments.listByTenant(tenantId)
    return rows.map(({ id, name, city, status }) => ({ id, name, city, status }))
  },
}
```

Do not instantiate Prisma in client code and do not read an arbitrary tenant ID from URL/search params.

- [ ] **Step 6: Implement login, protected shell, and compact real-data UI**

Reuse the current Matriz OTP/broker flow under new Seumei branding. `AuthGate` redirects unauthenticated users to `/login`. `HomeSummary` fetches `/api/home-summary` only after `useAuth()` reports a session and renders exactly four states: loading, unauthorized, database unavailable, and success/empty.

The success UI contains only company context, establishment count, first establishment, and a small “fundação ativa” status. Do not add fake navigation for products, orders, stock, or storefront.

- [ ] **Step 7: Run the new app gates**

```powershell
corepack pnpm --filter @matriz/app-seumei test
corepack pnpm --filter @matriz/app-seumei typecheck
corepack pnpm --filter @matriz/app-seumei lint
corepack pnpm --filter @matriz/app-seumei build
```

Expected: tests pass, Next build succeeds without a live Hub or database connection, and the API remains runtime-dynamic.

- [ ] **Step 8: Commit the new Seumei foundation**

```powershell
git add apps/seumeiapp pnpm-lock.yaml
git commit -m "feat(seumei): add tenant scoped application foundation"
```

---

### Task 4: Integrate both apps with Hub, registry, tooling, and deployment

**Files:**
- Modify: `tsconfig.base.json`
- Modify: `apps/matriz-hub/src/bootstrap/index.ts`
- Modify: `apps/matriz-hub/src/institutional/bootstrap.ts`
- Modify: `apps/matriz-hub/src/institutional/internal-apps-enrichment.ts`
- Modify: `apps/matriz-hub/src/domains/login/presentation/hub-login.presenter.ts`
- Modify: `apps/matriz-hub/src/ecosystem/shared-cache-contract.ts`
- Modify: `packages/flows/ecosystem/src/index.tsx`
- Modify: `tooling/scripts/build-app.ts`
- Modify: `tooling/scripts/export-app.ts`
- Modify: `tooling/scripts/verify-app-boundaries.ts`
- Modify: `tooling/visual-audit/routes.mjs`
- Modify: `.github/workflows/deploy-apps.yml`
- Modify: `.github/workflows/split-apps.yml`
- Modify: `tests/smoke/manifests.test.ts`
- Modify: `tests/smoke/registry.test.ts`
- Modify: `tests/smoke/app-boundaries.test.ts`
- Modify: `tests/smoke/public-contracts.test.ts`

**Interfaces:**
- Consumes: both public contracts from Tasks 2 and 3.
- Produces: aliases `@apps/matriz-admin/public-contract` and `@apps/seumei/public-contract` (the latter resolves to `apps/seumeiapp/public-contract.ts`); Hub registry containing 10 unique apps.

- [ ] **Step 1: Update smoke expectations first**

Add both manifests and assert:

```ts
expect(new Set(ids)).toEqual(new Set([
  "matriz-hub", "matriz-desktop", "matrizlib", "matriz-workbench", "sites",
  "spot", "matriz-admin", "seumei", "contracts", "willdash",
]))
expect(registry.get("matriz-admin")?.baseUrl).toBe("http://localhost:3002")
expect(registry.get("seumei")?.baseUrl).toBe("http://localhost:3008")
```

- [ ] **Step 2: Run smoke tests and witness RED**

```powershell
corepack pnpm vitest run --config vitest.config.ts tests/smoke/manifests.test.ts tests/smoke/registry.test.ts tests/smoke/app-boundaries.test.ts tests/smoke/public-contracts.test.ts
```

Expected: aliases and Hub registrations are missing.

- [ ] **Step 3: Wire aliases and Hub registration**

Point `@apps/seumei/public-contract` to `apps/seumeiapp/public-contract.ts`, add the Admin alias, import both manifests in Hub bootstrap/institutional ingestion, and update human labels. Preserve Contracts integrations targeting `seumei`; do not retarget them to Admin.

- [ ] **Step 4: Update scripts, boundaries, visual routes, and CI matrices**

Add both directory names to every explicit known-app list. Keep Matriz Admin on 3002 and Seumei on 3008. Add separate deploy choices and hook names (`VERCEL_DEPLOY_HOOK_MATRIZ_ADMIN`, existing `VERCEL_DEPLOY_HOOK_SEUMEI`). The deploy workflow maps input `matriz-admin` to `apps/matriz-admin` and input `seumei` to `apps/seumeiapp`; it does not assume `apps/${app}` for the latter. Do not include `apps/incoming/**` in workspace scans.

- [ ] **Step 5: Run Hub and smoke gates**

```powershell
corepack pnpm --filter @matriz/app-matriz-hub typecheck
corepack pnpm --filter @matriz/app-matriz-hub lint
corepack pnpm vitest run --config vitest.config.ts tests/smoke/manifests.test.ts tests/smoke/registry.test.ts tests/smoke/app-boundaries.test.ts tests/smoke/public-contracts.test.ts
```

Expected: all exit 0 and registry count is 10.

- [ ] **Step 6: Commit ecosystem integration**

```powershell
git add tsconfig.base.json apps/matriz-hub packages/flows/ecosystem tooling .github tests/smoke
git commit -m "feat(hub): register matriz admin and new seumei"
```

---

### Task 5: Retarget Matriz Control native lifecycle to Matriz Admin

**Files:**
- Modify: `apps/matriz-desktop/src/domain/types.ts`
- Modify: `apps/matriz-desktop/src/application/catalog.ts`
- Modify: `apps/matriz-desktop/src/application/catalog.test.ts`
- Modify: `apps/matriz-desktop/src/ui/app.tsx`
- Modify: `apps/matriz-desktop/src/ui/app.test.tsx`
- Modify: `apps/matriz-desktop/src/ui/styles.css`
- Modify: `apps/matriz-desktop/src/integration/unavailable-gateway.ts`
- Modify: `apps/matriz-desktop/src-tauri/src/catalog.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/native_apps.rs`
- Modify: `apps/matriz-desktop/src-tauri/tests/catalog.rs`
- Modify: `apps/matriz-desktop/src-tauri/tests/managed_operations.rs`
- Modify: `apps/matriz-desktop/src-tauri/tests/native_apps.rs`
- Modify: `.github/workflows/matriz-desktop.yml`

**Interfaces:**
- Consumes: package and native names from Task 2; Seumei web operation from Task 3.
- Produces: typed operations `app.matriz-admin.web`, `app.matriz-admin.native.build`, `app.matriz-admin.native.install`, `app.matriz-admin.native.start`, plus web-only `app.seumei.web`.

- [ ] **Step 1: Rewrite catalog tests to the desired operations**

Assert exact command resolution:

```rust
assert_eq!(
    managed_operation("app.matriz-admin.native.build")?.args,
    ["--filter", "@matriz/app-matriz-admin", "package:desktop"],
);
assert!(managed_operation("app.seumei.native.build").is_err());
```

Frontend tests must expect Web/Native controls only on Matriz Admin; Seumei has a single web start/stop action on port 3008.

- [ ] **Step 2: Run frontend and Rust tests and witness RED**

```powershell
corepack pnpm --filter @matriz/app-matriz-desktop test
$env:CARGO_INCREMENTAL='0'; $env:CARGO_PROFILE_DEV_DEBUG='0'; cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml
```

Expected: current typed catalog still points native operations to Seumei.

- [ ] **Step 3: Update typed catalogs and UI**

Rename native runtime types to Admin-specific values, keep user-entered terminal input isolated from operations, add Seumei web at port 3008, and preserve all PID/port authorization checks. UI labels must be `Matriz Admin Web`, `Matriz Admin Nativo`, and `Seumei`.

- [ ] **Step 4: Update Rust native detection**

Resolve installer only from:

```text
apps/matriz-admin/desktop/src-tauri/target/release/bundle/nsis/Matriz Admin_0.1.0_x64-setup.exe
```

Detect only `matriz-admin-desktop.exe` from current-user install candidates. Never accept an executable path or installer path from the renderer.

- [ ] **Step 5: Run all Control gates**

```powershell
corepack pnpm --filter @matriz/app-matriz-desktop test
corepack pnpm --filter @matriz/app-matriz-desktop typecheck
corepack pnpm --filter @matriz/app-matriz-desktop lint
corepack pnpm --filter @matriz/app-matriz-desktop build
$env:CARGO_INCREMENTAL='0'; $env:CARGO_PROFILE_DEV_DEBUG='0'; cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml
cargo clippy --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --all-targets -- -D warnings
```

Expected: all exit 0.

- [ ] **Step 6: Commit Control integration**

```powershell
git add apps/matriz-desktop .github/workflows/matriz-desktop.yml
git commit -m "feat(desktop): operate matriz admin native lifecycle"
```

---

### Task 6: Document ownership and migration intake

**Files:**
- Modify: `docs/architectural-laws.md`
- Modify: `docs/monorepo-structure.md`
- Modify: `docs/app-communication.md`
- Modify: `docs/app-ownership-map.md`
- Modify: `docs/DECISION-LOG.md`
- Modify: `docs/build-deploy-model.md`
- Modify: `apps/matriz-admin/README.md`
- Modify: `apps/seumeiapp/README.md`
- Create: `docs/seumei/MIGRATION-SLICES.md`

**Interfaces:**
- Consumes: final names, ownership, ports, and data authority from Tasks 1–5.
- Produces: canonical instructions for the next agent and an ordered migration ledger for the incoming source.

- [ ] **Step 1: Write the migration ledger**

Record these ordered slices with source concepts, not copied paths:

```text
S1 company + onboarding
S2 workspace shell + permissions
S3 products
S4 stock
S5 storefront + publish
S6 orders
S7 customers + finance
S8 design/layout capabilities
```

For every slice list acceptance gates: tenant ownership, repository port, Prisma adapter, presenter/view model, MatrizLib mapping, auth/permission test, route test, and no incoming runtime import.

- [ ] **Step 2: Update ownership and architectural docs**

State that Seumei owns its schema and commerce domain; Matriz Admin owns cross-product operator workflows and reaches product data through gateways. Replace stale statements that the old Seumei Tauri shell is app-local to Seumei.

- [ ] **Step 3: Verify documentation and forbidden imports**

```powershell
git diff --check
rg -n 'apps/(matriz-admin|seumeiapp)/(src|app)/' apps packages --glob '*.ts' --glob '*.tsx'
rg -n 'incoming/seumei-reference' apps packages --glob '*.ts' --glob '*.tsx'
```

Expected: first scan contains no cross-app internal import; second scan has no runtime imports.

- [ ] **Step 4: Commit documentation**

```powershell
git add docs apps/matriz-admin/README.md apps/seumeiapp/README.md
git commit -m "docs(seumei): define incremental product migration"
```

---

### Task 7: Validate, package, and publish the split

**Files:**
- Modify only if a gate exposes a defect: files owned by the failing task.
- Generated and ignored: `apps/matriz-admin/desktop/src-tauri/target/**`
- Generated and ignored: `apps/matriz-desktop/src-tauri/target/**`

**Interfaces:**
- Consumes: all prior task outputs.
- Produces: consecutive green global gates, a tested Matriz Admin installer, synced branch, and clean tracked tree.

- [ ] **Step 1: Run scoped product gates consecutively**

```powershell
corepack pnpm --filter @matriz/app-matriz-admin test
corepack pnpm --filter @matriz/app-matriz-admin typecheck
corepack pnpm --filter @matriz/app-matriz-admin lint
corepack pnpm --filter @matriz/app-matriz-admin build
corepack pnpm --filter @matriz/app-seumei test
corepack pnpm --filter @matriz/app-seumei typecheck
corepack pnpm --filter @matriz/app-seumei lint
corepack pnpm --filter @matriz/app-seumei build
```

Expected: every command exits 0.

- [ ] **Step 2: Run global gates**

```powershell
corepack pnpm run build
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run test:smoke
```

Run Prisma validation with process-only syntactically valid URLs when local secrets are absent; do not write an `.env` file:

```powershell
$env:CORE_DATABASE_URL='postgresql://validate:validate@127.0.0.1:5432/core'
$env:HUB_DATABASE_URL='postgresql://validate:validate@127.0.0.1:5432/hub'
$env:SPOT_DATABASE_URL='postgresql://validate:validate@127.0.0.1:5432/spot'
$env:SEUMEI_DATABASE_URL='postgresql://validate:validate@127.0.0.1:5432/seumei'
$env:CONTRACTS_DATABASE_URL='postgresql://validate:validate@127.0.0.1:5432/contracts'
$env:WILLDASH_DATABASE_URL='postgresql://validate:validate@127.0.0.1:5432/willdash'
corepack pnpm run prisma:validate
```

Expected: build/typecheck/lint/smoke and all six schemas exit 0.

- [ ] **Step 3: Validate browser routes**

Start Hub, Matriz Admin, and Seumei. Verify `/login` and `/` at desktop and 390px widths, no horizontal overflow, no success-route console errors, Hub lists both products, unauthenticated Seumei redirects to login, and authenticated Seumei calls `/api/home-summary` without a client-provided tenant selector.

- [ ] **Step 4: Package and test Matriz Admin Desktop**

```powershell
$env:CARGO_BUILD_JOBS='1'
corepack pnpm --filter @matriz/app-matriz-admin package:desktop
```

Install the generated current-user NSIS artifact silently, confirm `matriz-admin-desktop.exe` exists under its registered install location, launch it, verify a responsive `Matriz Admin` window, close it, uninstall, verify removal, reinstall, and close it again. Never infer paths when the registry provides `InstallLocation` and `UninstallString`.

- [ ] **Step 5: Audit the final tree**

```powershell
git diff --check
git status --short
git ls-files 'apps/**/.next/**' 'apps/**/dist/**' 'apps/**/target/**' 'output/**' '*.env' '*.log' '*.exe'
```

Expected: worktree has only intentional source changes before the final commit; forbidden generated/secret query returns nothing.

- [ ] **Step 6: Commit any gate-driven fixes**

```powershell
git add -u
git commit -m "fix(ecosystem): stabilize admin seumei split"
```

Skip this commit when no gate-driven fix exists.

- [ ] **Step 7: Integrate and push the approved branch**

```powershell
git fetch origin
git merge-base --is-ancestor origin/main HEAD
git push -u origin codex/matriz-desktop
git rev-list --left-right --count '@{upstream}...HEAD'
git status --short
```

If `origin/main` is not an ancestor, perform a normal merge, resolve without discarding either product, and repeat Steps 1–5. Expected final state: upstream count `0 0`, clean worktree, no direct push to `main`.
