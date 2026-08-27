# Installable Apps and Health Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows-first Health app that installs through Matriz Control and mutates the host with a low-memory smart app rail.

**Architecture:** `apps/health` owns system sampling, thresholds, API, presenters, and dashboard. `apps/matriz-control` owns a versioned install state, app-host presentation, lazy runtime activation, and a narrow read-only bridge for Control browser-tab counts. Cross-app access is limited to public manifests and a versioned DTO.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.6, Vitest 2, Node `os`, bounded Windows PowerShell, Electron IPC, CSS modules/global CSS.

**Spec:** `docs/superpowers/specs/2026-08-25-installable-apps-health-design.md`

## Global Constraints

- Windows is the only system-collector target in V1; unsupported readings must be explicit.
- Do not add a system-information dependency or a new shared package.
- Never import `apps/<other-app>/src/**` or `apps/<other-app>/app/**`.
- Health domain logic, sampling policy, and presenters remain in `apps/health`.
- Only one external iframe may be mounted at a time, and Health starts only when opened.
- Lightweight metrics refresh at one second, processes at five seconds, temperature at thirty seconds.
- PowerShell commands are fixed server-side, hidden, time-bounded, and output-bounded.
- UI consumes view models, not raw domain entities.
- Do not commit `.env`, `.next`, `.turbo`, logs, screenshots, build output, or cache artifacts.

---

### Task 1: Register Health as a first-class app

**Files:**
- Create: `apps/health/AGENTS.md`
- Create: `apps/health/docs/AGENT-START-HERE.md`
- Create: `apps/health/README.md`
- Create: `apps/health/package.json`
- Create: `apps/health/tsconfig.json`
- Create: `apps/health/vitest.config.ts`
- Create: `apps/health/next.config.mjs`
- Create: `apps/health/public-contract.ts`
- Create: `apps/health/src/manifest/manifest.ts`
- Create: `apps/health/src/bootstrap/index.ts`
- Create: `apps/health/app/layout.tsx`
- Create: `apps/health/app/page.tsx`
- Create: `apps/health/app/api/health/route.ts`
- Modify: `packages/foundation/constants/src/index.ts`
- Modify: `packages/platform/config/src/index.ts`
- Modify: `tsconfig.base.json`
- Modify: `apps/matriz-hub/src/bootstrap/index.ts`
- Modify: `tests/smoke/manifests.test.ts`
- Modify: `tests/smoke/registry.test.ts`

**Interfaces:**
- Consumes: `AppManifestDTO`, `getGlobalRegistry()`, `monorepoConfig.baseUrls`.
- Produces: `manifest.appId === "health"`, `bootstrapHealth(): { appId: "health" }`, base URL `http://127.0.0.1:3010`, alias `@apps/health/public-contract`.

- [ ] **Step 1: Add failing smoke expectations**

Import the public contract and add `healthManifest` to both manifest arrays. Assert thirteen registered manifests and the Health base URL:

```ts
import { manifest as healthManifest } from "@apps/health/public-contract"

expect(new Set(ids)).toContain("health")
expect(registry.get("health")?.baseUrl).toBe("http://127.0.0.1:3010")
```

- [ ] **Step 2: Run the smoke tests and verify the missing contract failure**

Run: `corepack pnpm exec vitest run tests/smoke/manifests.test.ts tests/smoke/registry.test.ts`

Expected: FAIL because `@apps/health/public-contract` and the `health` app ID do not exist.

- [ ] **Step 3: Add the app ID, runtime, alias, skeleton, manifest, and bootstrap**

Add `"health"` to `MATRIZ_APP_IDS`, `health: "Health"` to `MATRIZ_APP_NAMES`, this runtime to `localAppRuntimes`, and the root alias:

```ts
{ slug: "health", appId: "health", directory: "apps/health", preferredPort: 3010, host: "127.0.0.1", healthPath: "/api/health", lifecycle: "experimental", runtimeAdapter: "next" }
```

Use this manifest shape:

```ts
export const manifest: AppManifestDTO = {
  appId: "health",
  name: "Health",
  description: "Observabilidade local leve para recursos e processos do Windows.",
  version: "0.1.0",
  contractVersion: "v1",
  primaryRoute: "/",
  routes: [{ label: "Visão geral", path: "/", order: 0 }],
  capabilities: [{ id: "health.system.observe", name: "Observar sistema", description: "Lê métricas locais sem controlar processos." }],
  eventsProduced: [], eventsConsumed: [], integrations: [],
  onboardingSupport: { participates: true, hasSpecificStep: false },
  navigationEntry: { label: "Health", path: "/", icon: "health", order: 9 },
  ownership: { domainSummary: "Observabilidade local do computador; não controla produtos nem processos.", maintainers: ["matriz-core"] },
  widgets: [{ id: "health.widget.system", name: "Saúde do sistema", description: "Resume CPU, memória e sensores disponíveis." }],
}
```

The package scripts must be `dev: next dev -p 3010`, `build`, `start: next start -p 3010`, `test`, `lint`, and `typecheck`. The initial page renders `Health iniciando`; `/api/health` returns `{ appId: "health", status: "ok" }`.

- [ ] **Step 4: Register the public manifest in the Hub bootstrap**

Import only `@apps/health/public-contract`, add it to the manifest list, and use `monorepoConfig.baseUrls[m.appId]` like every other app.

- [ ] **Step 5: Run scoped and smoke tests**

Run: `corepack pnpm --filter @matriz/app-health typecheck`

Run: `corepack pnpm exec vitest run tests/smoke/manifests.test.ts tests/smoke/registry.test.ts`

Expected: PASS with thirteen manifests and Health registered at port 3010. Update any pre-existing bootstrap count assertion to the actual full bootstrap list plus Health, without deleting unrelated apps from the smoke registry.

- [ ] **Step 6: Commit**

```powershell
git add apps/health packages/foundation/constants/src/index.ts packages/platform/config/src/index.ts tsconfig.base.json apps/matriz-hub/src/bootstrap/index.ts tests/smoke/manifests.test.ts tests/smoke/registry.test.ts
git commit -m "feat(health): register first-class health app"
```

---

### Task 2: Implement deterministic Health sampling

**Files:**
- Create: `apps/health/src/domain/system-health.ts`
- Create: `apps/health/src/domain/system-health.test.ts`
- Create: `apps/health/src/application/collect-system-snapshot.ts`
- Create: `apps/health/src/application/collect-system-snapshot.test.ts`
- Create: `apps/health/src/integration/node-system-sampler.ts`
- Create: `apps/health/src/integration/windows-detail-sampler.ts`
- Create: `apps/health/src/integration/windows-detail-sampler.test.ts`
- Create: `apps/health/app/api/system/snapshot/route.ts`

**Interfaces:**
- Consumes: Node `os`, `child_process.execFile`, fixed PowerShell scripts.
- Produces: `SystemSnapshot`, `SystemSampler`, `DetailSampler`, `collectSystemSnapshot(deps)`, `GET /api/system/snapshot`.

- [ ] **Step 1: Write failing domain calculation tests**

```ts
it("calculates bounded memory and CPU percentages", () => {
  expect(memoryUsagePercent(75, 100)).toBe(75)
  expect(memoryUsagePercent(120, 100)).toBe(100)
  expect(cpuUsagePercent({ idle: 20, total: 100 }, { idle: 30, total: 140 })).toBe(75)
})

it("marks missing temperature as unavailable", () => {
  expect(sensorReading(null, "celsius")).toEqual({ availability: "unavailable", value: null, unit: "celsius" })
})
```

- [ ] **Step 2: Run the domain test and verify failure**

Run: `corepack pnpm --filter @matriz/app-health test -- src/domain/system-health.test.ts`

Expected: FAIL because the domain module does not exist.

- [ ] **Step 3: Implement domain types and pure functions**

Define:

```ts
export interface CpuTicks { readonly idle: number; readonly total: number }
export interface SensorReading { readonly availability: "available" | "unavailable"; readonly value: number | null; readonly unit: "celsius" }
export interface ProcessReading { readonly pid: number; readonly name: string; readonly cpuSeconds: number; readonly memoryBytes: number }
export interface SystemSnapshot {
  readonly sampledAt: string
  readonly platform: string
  readonly uptimeSeconds: number
  readonly cpuPercent: number
  readonly memory: { readonly totalBytes: number; readonly usedBytes: number; readonly percent: number }
  readonly temperature: SensorReading
  readonly processes: readonly ProcessReading[]
}
export function memoryUsagePercent(used: number, total: number): number
export function cpuUsagePercent(previous: CpuTicks, current: CpuTicks): number
export function sensorReading(value: number | null, unit: "celsius"): SensorReading
```

Clamp percentages to `0..100`, round to one decimal, and reject non-finite sensor values as unavailable.

- [ ] **Step 4: Add failing application and Windows-adapter tests**

Use fake samplers and a fake clock to assert merged output. For the Windows adapter, inject an `exec` function and assert it receives `powershell.exe`, fixed arguments, `windowsHide: true`, a timeout no greater than 2,000 ms, and a bounded buffer. Assert invalid JSON returns `[]`/`null` rather than throwing away lightweight metrics.

- [ ] **Step 5: Implement samplers and cached collection**

Define:

```ts
export interface LightweightSample { platform: string; uptimeSeconds: number; cpuTicks: CpuTicks; totalMemoryBytes: number; freeMemoryBytes: number }
export interface SystemSampler { sample(): LightweightSample }
export interface DetailSample { processes: readonly ProcessReading[]; temperatureCelsius: number | null }
export interface DetailSampler { sample(nowMs: number): Promise<DetailSample> }
export async function collectSystemSnapshot(deps: { system: SystemSampler; details: DetailSampler; now: () => Date }): Promise<SystemSnapshot>
```

Keep previous CPU ticks in the Node sampler. Cache processes for 5,000 ms and temperature for 30,000 ms in the Windows adapter. Cap processes at twelve and strip command lines/paths. The PowerShell executable and scripts are constants; no request field enters them.

- [ ] **Step 6: Add the route with degraded success behavior**

`GET` calls the singleton use case and returns the snapshot. On an unexpected failure, return status 503 with `{ error: "snapshot_unavailable" }`; detail-adapter failures must already degrade to empty processes/unavailable temperature and still return 200.

- [ ] **Step 7: Run tests and typecheck**

Run: `corepack pnpm --filter @matriz/app-health test`

Run: `corepack pnpm --filter @matriz/app-health typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add apps/health/src apps/health/app/api/system
git commit -m "feat(health): collect lightweight Windows metrics"
```

---

### Task 3: Build the Health dashboard through presenters

**Files:**
- Create: `apps/health/src/ui/presenters/system-health-presenter.ts`
- Create: `apps/health/src/ui/presenters/system-health-presenter.test.ts`
- Create: `apps/health/src/ui/health-dashboard.tsx`
- Create: `apps/health/app/globals.css`
- Modify: `apps/health/app/layout.tsx`
- Modify: `apps/health/app/page.tsx`

**Interfaces:**
- Consumes: `SystemSnapshot` JSON from `/api/system/snapshot`.
- Produces: `SystemHealthVM`, `toSystemHealthVM(snapshot)`, responsive dashboard with stale/error states.

- [ ] **Step 1: Write failing presenter tests**

```ts
it("formats raw bytes and unavailable sensors", () => {
  const vm = toSystemHealthVM(sample)
  expect(vm.memory.value).toBe("12,0 GB / 16,0 GB")
  expect(vm.temperature.value).toBe("Não disponível neste hardware")
  expect(vm.processes[0]).toMatchObject({ memory: "1,5 GB", pid: "4242" })
})
```

Also assert CPU/memory severities: `<70 healthy`, `70..84 attention`, `>=85 critical`.

- [ ] **Step 2: Run the presenter test and verify failure**

Run: `corepack pnpm --filter @matriz/app-health test -- src/ui/presenters/system-health-presenter.test.ts`

Expected: FAIL because the presenter does not exist.

- [ ] **Step 3: Implement the view model and presenter**

Define focused view-model types:

```ts
export type MetricTone = "healthy" | "attention" | "critical" | "unavailable"
export interface MetricVM { label: string; value: string; detail: string; percent: number | null; tone: MetricTone }
export interface ProcessVM { pid: string; name: string; cpu: string; memory: string }
export interface SystemHealthVM { sampledAt: string; cpu: MetricVM; memory: MetricVM; temperature: MetricVM; uptime: MetricVM; processes: readonly ProcessVM[] }
```

Use `Intl.NumberFormat("pt-BR")`; never format in the domain or component.

- [ ] **Step 4: Implement polling and last-good-state behavior**

`HealthDashboard` fetches every 1,000 ms only while `document.visibilityState === "visible"`. Keep the last good VM on failure, display `Leitura desatualizada`, and back off failed requests to 2,000 then 5,000 ms. Do not render raw snapshot properties directly.

- [ ] **Step 5: Implement the visual dashboard**

Use a translucent dark Windows-instrument-panel aesthetic: four metric cards, compact spark-like CSS bars without canvas loops, a capped process table, explicit temperature availability, and a small connection indicator. Use semantic HTML, visible focus, and `prefers-reduced-motion`.

- [ ] **Step 6: Run Health checks**

Run: `corepack pnpm --filter @matriz/app-health test`

Run: `corepack pnpm --filter @matriz/app-health lint`

Run: `corepack pnpm --filter @matriz/app-health typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add apps/health/app apps/health/src/ui
git commit -m "feat(health): add resource dashboard"
```

---

### Task 4: Add Control installation state and Store

**Files:**
- Create: `apps/matriz-control/src/domain/installable-apps.ts`
- Create: `apps/matriz-control/src/domain/installable-apps.test.ts`
- Create: `apps/matriz-control/src/integration/apps/installable-app-catalog.ts`
- Create: `apps/matriz-control/src/ui/apps/installable-apps-presenter.ts`
- Create: `apps/matriz-control/src/ui/apps/installable-apps-presenter.test.ts`
- Create: `apps/matriz-control/src/ui/apps/installed-apps-context.tsx`
- Create: `apps/matriz-control/src/ui/apps/app-store.tsx`
- Modify: `apps/matriz-control/app/store/page.tsx`
- Modify: `apps/matriz-control/app/globals.css`
- Modify: `apps/matriz-control/next.config.mjs`
- Modify: `apps/matriz-control/package.json`

**Interfaces:**
- Consumes: `healthManifest` from `@apps/health/public-contract`, platform config base URL.
- Produces: `normalizeInstalledAppsState`, `installApp`, `uninstallApp`, `INSTALLABLE_APPS`, `InstalledAppsProvider`, `useInstalledApps()`.

- [ ] **Step 1: Write failing installation-domain tests**

```ts
it("normalizes unknown and duplicate ids", () => {
  expect(normalizeInstalledAppsState({ version: 1, installedIds: ["health", "unknown", "health"] }, ["health"]))
    .toEqual({ version: 1, installedIds: ["health"], activeAppId: null })
})

it("installs and uninstalls idempotently", () => {
  const installed = installApp(emptyInstalledAppsState(), "health", ["health"])
  expect(installApp(installed, "health", ["health"])).toEqual(installed)
  expect(uninstallApp({ ...installed, activeAppId: "health" }, "health")).toEqual(emptyInstalledAppsState())
})
```

- [ ] **Step 2: Run the Control test and verify failure**

Run: `corepack pnpm --filter @matriz/app-matriz-control test -- src/domain/installable-apps.test.ts`

Expected: FAIL because the domain module does not exist.

- [ ] **Step 3: Implement the pure versioned state**

```ts
export const INSTALLED_APPS_STATE_VERSION = 1 as const
export interface InstalledAppsState { version: 1; installedIds: readonly string[]; activeAppId: string | null }
export function emptyInstalledAppsState(): InstalledAppsState
export function normalizeInstalledAppsState(value: unknown, allowedIds: readonly string[]): InstalledAppsState
export function installApp(state: InstalledAppsState, appId: string, allowedIds: readonly string[]): InstalledAppsState
export function uninstallApp(state: InstalledAppsState, appId: string): InstalledAppsState
export function activateApp(state: InstalledAppsState, appId: string | null): InstalledAppsState
```

Activation accepts only installed IDs or `null`.

- [ ] **Step 4: Add catalog and presenter tests**

Assert Health identity comes from its manifest, its runtime is `health`/3010, and the presenter emits mutation `control.smart-app-rail` only when Health is installed.

- [ ] **Step 5: Implement catalog, presenter, and context**

```ts
export interface InstallableAppDefinition {
  manifest: AppManifestDTO
  projectId: string
  baseUrl: string
  glyph: string
  accent: "health"
  mutationId: "control.smart-app-rail"
}
```

Persist under `matriz-control:installed-apps:v1` in `localStorage`, guard SSR, and expose `install`, `uninstall`, `activate`, `state`, and presenter-derived app view models. Do not start a runtime during install.

- [ ] **Step 6: Replace the Store placeholder**

Render a Health card with capabilities from the manifest, clear installed state, and actions `Instalar`, `Abrir`, and `Desinstalar`. After install, the shell mutation becomes visible immediately through context state.

- [ ] **Step 7: Configure the public-contract import**

Add `@matriz/platform-storage` only if the existing storage adapter is used; otherwise use the small versioned localStorage adapter in Control. Ensure `next.config.mjs` transpiles only existing workspace packages and does not expose Health internals.

- [ ] **Step 8: Run Control checks**

Run: `corepack pnpm --filter @matriz/app-matriz-control test`

Run: `corepack pnpm --filter @matriz/app-matriz-control lint`

Run: `corepack pnpm --filter @matriz/app-matriz-control typecheck`

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add apps/matriz-control/src/domain/installable-apps* apps/matriz-control/src/integration/apps apps/matriz-control/src/ui/apps apps/matriz-control/app/store apps/matriz-control/app/globals.css apps/matriz-control/next.config.mjs apps/matriz-control/package.json
git commit -m "feat(matriz-control): install known local apps"
```

---

### Task 5: Add smart rail and lazy single-app host

**Files:**
- Create: `apps/matriz-control/src/ui/apps/smart-app-rail.tsx`
- Create: `apps/matriz-control/src/ui/apps/external-app-stage.tsx`
- Create: `apps/matriz-control/src/ui/apps/app-host.test.tsx`
- Create: `apps/matriz-control/app/api/apps/readiness/route.ts`
- Create: `apps/matriz-control/app/api/apps/readiness/route.test.ts`
- Modify: `apps/matriz-control/src/ui/control-shell.tsx`
- Modify: `apps/matriz-control/app/layout.tsx`
- Modify: `apps/matriz-control/app/globals.css`

**Interfaces:**
- Consumes: `useInstalledApps()`, `useTerminal().openSession(projectId)`, catalog view models.
- Produces: `SmartAppRail`, `ExternalAppStage`, allowlisted `GET /api/apps/readiness?appId=health`.

- [ ] **Step 1: Write failing host behavior tests**

Assert:

```tsx
expect(screen.queryByLabelText("Alternar apps")).not.toBeInTheDocument()
// after installing health
expect(screen.getByLabelText("Alternar apps")).toBeVisible()
expect(container.querySelectorAll("iframe")).toHaveLength(1)
```

Switching back to Control must remove the iframe, not hide it.

- [ ] **Step 2: Run the host tests and verify failure**

Run: `corepack pnpm --filter @matriz/app-matriz-control test -- src/ui/apps/app-host.test.tsx`

Expected: FAIL because rail and host do not exist.

- [ ] **Step 3: Implement the allowlisted readiness route**

Accept only `appId`; resolve the URL from `INSTALLABLE_APPS`; issue a server-side `HEAD` with a 750 ms timeout; return `{ appId, ready }`. Unknown IDs return 404. Never accept a URL or path from the browser.

- [ ] **Step 4: Implement the hover/focus rail**

The collapsed width is 18 px and expanded width is 176 px. Include Control and installed apps, readable `aria-label`s, status text, active marker, and keyboard focus expansion. Use fixed glyphs and view-model labels; no raw manifest entity reaches component props.

- [ ] **Step 5: Implement lazy activation**

On external selection, call `openSession(projectId)`, start a 1,000 ms visual transition, poll readiness with bounded attempts, then mount one iframe with `src={baseUrl}` and `title={name}`. On timeout show Retry and Terminal actions. Cancelling/switching invalidates the previous activation with `AbortController`.

- [ ] **Step 6: Integrate the provider and contextual theme**

Wrap `ControlShell` with `InstalledAppsProvider`. Add `data-active-app="health"` to the root only while Health is selected. Set fixed `--app-accent`, `--app-glow`, and translucent background values in CSS. Honor reduced motion and keep the terminal dock above the external stage.

- [ ] **Step 7: Run Control tests and build**

Run: `corepack pnpm --filter @matriz/app-matriz-control test`

Run: `corepack pnpm --filter @matriz/app-matriz-control lint`

Run: `corepack pnpm --filter @matriz/app-matriz-control typecheck`

Run: `corepack pnpm --filter @matriz/app-matriz-control build`

Expected: PASS and no more than one iframe in host tests.

- [ ] **Step 8: Commit**

```powershell
git add apps/matriz-control/src/ui/apps apps/matriz-control/src/ui/control-shell.tsx apps/matriz-control/app/api/apps apps/matriz-control/app/layout.tsx apps/matriz-control/app/globals.css
git commit -m "feat(matriz-control): add intelligent app rail"
```

---

### Task 6: Bridge Control browser-tab health safely

**Files:**
- Create: `packages/integration/api-contracts/src/v1/host-health.ts`
- Create: `packages/integration/api-contracts/src/v1/host-health.test.ts`
- Modify: `packages/integration/api-contracts/src/v1/index.ts`
- Modify: `apps/matriz-control/src/domain/desktop-bridge.ts`
- Modify: `apps/matriz-control/src/domain/desktop-command.test.ts`
- Modify: `apps/matriz-control/desktop/main.ts`
- Create: `apps/matriz-control/src/ui/apps/health-host-bridge.ts`
- Create: `apps/matriz-control/src/ui/apps/health-host-bridge.test.ts`
- Modify: `apps/matriz-control/src/ui/apps/external-app-stage.tsx`
- Create: `apps/health/src/integration/control-host-bridge.ts`
- Create: `apps/health/src/integration/control-host-bridge.test.ts`
- Modify: `apps/health/src/ui/health-dashboard.tsx`

**Interfaces:**
- Consumes: Electron repository tab lists and active Health iframe window.
- Produces: `ControlHostHealthDTO`, `controlHostHealthSchema`, command `health.host-snapshot`, message `matriz.control.health.v1`.

- [ ] **Step 1: Write failing public-contract tests**

```ts
expect(controlHostHealthSchema.parse({
  version: "v1", sampledAt: "2026-08-25T12:00:00.000Z", openTabs: 3, suspendedTabs: 1,
})).toMatchObject({ openTabs: 3 })
expect(() => controlHostHealthSchema.parse({ version: "v1", sampledAt: "x", openTabs: -1, suspendedTabs: 0 })).toThrow()
```

- [ ] **Step 2: Run contract tests and verify failure**

Run: `corepack pnpm --filter @matriz/integration-api-contracts test -- src/v1/host-health.test.ts`

Expected: FAIL because the schema does not exist.

- [ ] **Step 3: Implement and export the DTO**

```ts
export const controlHostHealthSchema = z.object({
  version: z.literal("v1"),
  sampledAt: z.string().datetime(),
  openTabs: z.number().int().nonnegative(),
  suspendedTabs: z.number().int().nonnegative(),
})
export type ControlHostHealthDTO = z.infer<typeof controlHostHealthSchema>
export const CONTROL_HOST_HEALTH_MESSAGE = "matriz.control.health.v1" as const
```

- [ ] **Step 4: Add failing desktop parser/dispatch tests**

Assert `parseDesktopCommand({ type: "health.host-snapshot" })` succeeds with no payload, and extra command types still fail. Add a pure helper in `desktop/main.ts` or a nearby app-local module that counts repository tabs as open vs suspended.

- [ ] **Step 5: Implement the read-only desktop command**

Add the command to `DesktopCommand`, `DesktopResult`, and `noPayload`. In Electron main, iterate capsules/tabs, count `status === "suspended"` separately, and return no titles, URLs, capsule names, or IDs.

- [ ] **Step 6: Implement exact-origin parent messaging**

`health-host-bridge.ts` invokes the desktop command every second only while Health is active and posts:

```ts
{ type: CONTROL_HOST_HEALTH_MESSAGE, payload: dto }
```

The target origin must be the exact Health base origin. The receiver accepts only the exact Control origins (`http://127.0.0.1:3008`, `http://localhost:3008`), `event.source === window.parent`, the exact message type, and a payload passing `controlHostHealthSchema`.

- [ ] **Step 7: Present Control tab metrics in Health**

Add a `Guias do Control` metric card sourced from the bridge. Before the first valid message, render `Disponível no Matriz Control Desktop`. Do not merge this count into OS process readings.

- [ ] **Step 8: Run contract, Control, and Health checks**

Run: `corepack pnpm --filter @matriz/integration-api-contracts test`

Run: `corepack pnpm --filter @matriz/app-matriz-control test`

Run: `corepack pnpm --filter @matriz/app-matriz-control typecheck`

Run: `corepack pnpm --filter @matriz/app-health test`

Run: `corepack pnpm --filter @matriz/app-health typecheck`

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add packages/integration/api-contracts apps/matriz-control/desktop/main.ts apps/matriz-control/src/domain apps/matriz-control/src/ui/apps apps/health/src
git commit -m "feat(health): bridge Control browser tab metrics"
```

---

### Task 7: Verify the complete install-to-Health flow

**Files:**
- Modify: `apps/matriz-control/README.md`
- Modify: `apps/health/README.md`
- Modify: `docs/DECISION-LOG.md`
- Modify only if required by implementation: `.env.example`

**Interfaces:**
- Consumes: completed Store, rail, runtime activation, Health API/dashboard, desktop bridge.
- Produces: validation evidence and concise operating documentation.

- [ ] **Step 1: Run focused unit suites**

Run:

```powershell
corepack pnpm --filter @matriz/app-health test
corepack pnpm --filter @matriz/app-matriz-control test
corepack pnpm --filter @matriz/integration-api-contracts test
```

Expected: all PASS.

- [ ] **Step 2: Run scoped static/build validation**

Run:

```powershell
corepack pnpm --filter @matriz/app-health lint
corepack pnpm --filter @matriz/app-health typecheck
corepack pnpm --filter @matriz/app-health build
corepack pnpm --filter @matriz/app-matriz-control lint
corepack pnpm --filter @matriz/app-matriz-control typecheck
corepack pnpm --filter @matriz/app-matriz-control build
```

Expected: all PASS.

- [ ] **Step 3: Run architectural validation**

Run:

```powershell
corepack pnpm test:smoke
corepack pnpm test:boundaries
```

Expected: PASS with Health included in manifest/registry counts and no forbidden app-internal import.

- [ ] **Step 4: Verify the real browser flow**

Start Health and Control with their declared scripts. Verify at desktop width and 700 px width:

1. Store initially offers Health installation.
2. Installing immediately reveals the collapsed rail without starting Health.
3. Hover/focus expands labels.
4. Opening Health shows a transition, starts only Health, and mounts one iframe.
5. Shell accent/background changes.
6. CPU and memory refresh; process rows update at the slower cadence.
7. missing temperature is explicit rather than zero.
8. desktop mode shows Control tab counts; web mode shows the unavailable copy.
9. switching to Control removes the iframe.
10. reduced-motion mode disables transition motion.

- [ ] **Step 5: Document ownership and the mutation decision**

Control README explains install semantics, local persistence, runtime-on-open,
and how to remove Health. Health README explains Windows scope, unavailable
sensors, sampling cadence, and ownership. Add a short Decision Log entry with
decision, reason, impact, and review trigger. Do not add an environment variable
unless the implementation genuinely introduced one.

- [ ] **Step 6: Inspect the final diff for forbidden artifacts and secrets**

Run: `git status --short`

Run: `git diff --check`

Run: `git diff --name-only --cached`

Expected: no `.env`, `.next`, `.turbo`, log, screenshot, build, or cache artifacts; preserve unrelated user changes such as a pre-existing `.env.example` edit.

- [ ] **Step 7: Commit documentation/verification adjustments**

```powershell
git add apps/matriz-control/README.md apps/health/README.md docs/DECISION-LOG.md
git commit -m "docs: record installable app mutation model"
```
