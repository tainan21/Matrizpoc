# Matriz Hub Alpha Cycle 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not dispatch subagents; this repository session requires inline execution.

**Goal:** Deliver the app-local visual foundation, responsive operational shell, global states, command navigation, and a real-data operational overview for `apps/matriz-hub`.

**Architecture:** Add a Hub-only environment layer under `apps/matriz-hub/src/ui/environment`, backed by pure navigation and overview presenters. The existing auth adoption remains the owner of session state and composes the new shell; the home route gathers public registry and institutional data, converts it to a serializable ViewModel, and renders a spatial operational workspace.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.6, CSS Modules/global app-local CSS, Vitest 2, existing Matriz public contracts and registries.

## Global Constraints

- Change only `apps/matriz-hub` plus this plan document.
- Never import `apps/<other-app>/src/**` or `apps/<other-app>/app/**`.
- Cross-app data may come only from existing public contracts and shared integration packages.
- Do not modify `packages/design/*`, root configuration, Prisma schemas, or other apps in Cycle 1.
- UI consumes ViewModels, never raw domain entities.
- Existing route URLs and API contracts remain unchanged.
- Do not fabricate telemetry, health, environment, execution, deployment, or agent state.
- Dark mode is canonical for this alpha; semantic contrast and reduced motion are required.
- Preserve all unrelated and pre-existing working-tree changes.
- Required validation: Hub unit tests, Hub typecheck, Hub lint, smoke tests, and browser checks at 1440, 1024, 768, and 390 px.

---

## File Structure

### New files

- `apps/matriz-hub/src/ui/environment/types.ts` — serializable UI contracts for navigation, overview, state, and session.
- `apps/matriz-hub/src/ui/environment/navigation.ts` — pure route grouping, active-route resolution, and command items.
- `apps/matriz-hub/src/ui/environment/navigation.test.ts` — navigation behavior and coverage tests.
- `apps/matriz-hub/src/ui/environment/overview-presenter.ts` — pure conversion of public data snapshots into `HubOverviewVM`.
- `apps/matriz-hub/src/ui/environment/overview-presenter.test.ts` — overview status, attention, source, and empty-state tests.
- `apps/matriz-hub/src/ui/environment/icons.tsx` — app-local SVG icon grammar.
- `apps/matriz-hub/src/ui/environment/status.tsx` — semantic status mark and data-origin primitives.
- `apps/matriz-hub/src/ui/environment/GlobalContextBar.tsx` — global context and user controls.
- `apps/matriz-hub/src/ui/environment/OperationalNav.tsx` — grouped desktop/mobile navigation.
- `apps/matriz-hub/src/ui/environment/CommandSearch.tsx` — keyboard-accessible route command surface.
- `apps/matriz-hub/src/ui/environment/OperationalDock.tsx` — honest source/activity footer.
- `apps/matriz-hub/src/ui/environment/SurfaceState.tsx` — shared loading, empty, error, denied, partial, and planned states.
- `apps/matriz-hub/src/ui/environment/HubOverview.tsx` — operational overview screen consuming only `HubOverviewVM`.
- `apps/matriz-hub/src/ui/environment/hub-environment.css` — Hub-only tokens, shell layout, primitives, responsive rules, and motion policy.
- `apps/matriz-hub/app/loading.tsx` — global loading projection.
- `apps/matriz-hub/app/error.tsx` — recoverable route boundary.
- `apps/matriz-hub/app/not-found.tsx` — safe not-found surface.

### Modified files

- `apps/matriz-hub/app/globals.css` — import the app-local environment stylesheet and set canonical alpha defaults.
- `apps/matriz-hub/src/ui/components/HubShell.tsx` — replace the fixed sidebar with the new responsive environment composition.
- `apps/matriz-hub/src/auth/provider.tsx` — remove the separate session bar and pass session/sign-out data into `HubShell`.
- `apps/matriz-hub/app/page.tsx` — gather real snapshots, create `HubOverviewVM`, and render `HubOverview`.

---

### Task 1: Navigation model and route grouping

**Files:**

- Create: `apps/matriz-hub/src/ui/environment/types.ts`
- Create: `apps/matriz-hub/src/ui/environment/navigation.ts`
- Create: `apps/matriz-hub/src/ui/environment/navigation.test.ts`

**Interfaces:**

- Produces: `HubIconName`, `HubStatus`, `HubNavItem`, `HubNavGroup`, `HubCommandItem`, `HUB_NAV_GROUPS`, `resolveActiveNavItem(pathname)`, and `buildCommandItems(groups)`.
- Consumes: route paths only; it must not import the manifest or a framework module.

- [ ] **Step 1: Write failing navigation tests**

```ts
import { describe, expect, it } from "vitest"
import { HUB_NAV_GROUPS, buildCommandItems, resolveActiveNavItem } from "./navigation"

describe("Hub operational navigation", () => {
  it("groups every primary existing surface without duplicate paths", () => {
    const paths = HUB_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href))
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths).toEqual(expect.arrayContaining([
      "/", "/projects", "/health", "/registry", "/ecosystem",
      "/events", "/telemetry", "/docs", "/praticies",
    ]))
  })

  it("prefers the most specific parent for nested document routes", () => {
    expect(resolveActiveNavItem("/docs/context/ctx_1")?.href).toBe("/docs/context")
    expect(resolveActiveNavItem("/projects/matriz-hub")?.href).toBe("/projects")
  })

  it("builds searchable commands with group context", () => {
    expect(buildCommandItems(HUB_NAV_GROUPS)).toContainEqual(
      expect.objectContaining({ href: "/telemetry", groupLabel: "Operação" }),
    )
  })
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run:

```text
pnpm --filter @matriz/app-matriz-hub exec vitest run --config vitest.config.ts src/ui/environment/navigation.test.ts
```

Expected: FAIL because `navigation.ts` does not exist.

- [ ] **Step 3: Implement the serializable contracts and navigation registry**

Define exact unions:

```ts
export type HubStatus =
  | "available" | "running" | "waiting" | "attention" | "approval"
  | "blocked" | "complete" | "failed" | "temporary" | "official"
  | "archived" | "planned" | "unavailable" | "unknown"

export type HubIconName =
  | "overview" | "project" | "health" | "architecture" | "registry"
  | "ecosystem" | "link" | "event" | "telemetry" | "onboarding"
  | "flag" | "docs" | "review" | "context" | "graph" | "timeline"
  | "tool" | "roadmap" | "agent" | "release" | "audit" | "search"
  | "menu" | "close" | "chevron" | "activity" | "user" | "logout"
```

Use grouped, human labels and include only actual Cycle 1 destinations. Future routes may be present with `availability: "planned"` only after their page exists in later cycles.

- [ ] **Step 4: Run the navigation tests**

Expected: PASS.

- [ ] **Step 5: Commit the navigation model**

```text
git add apps/matriz-hub/src/ui/environment/types.ts apps/matriz-hub/src/ui/environment/navigation.ts apps/matriz-hub/src/ui/environment/navigation.test.ts
git commit -m "feat(hub): define operational navigation model"
```

### Task 2: Operational overview presenter

**Files:**

- Modify: `apps/matriz-hub/src/ui/environment/types.ts`
- Create: `apps/matriz-hub/src/ui/environment/overview-presenter.ts`
- Create: `apps/matriz-hub/src/ui/environment/overview-presenter.test.ts`

**Interfaces:**

- Consumes: `HubOverviewSource` containing plain app, project, event, and telemetry snapshots.
- Produces: `HubOverviewVM` with `portfolio`, `health`, `attention`, `activity`, `flow`, `nextAction`, and `origins`.

- [ ] **Step 1: Write failing presenter tests**

Cover:

```ts
it("marks degraded and offline projects as attention without inventing incidents", () => {})
it("reports an honest empty session when events and telemetry are absent", () => {})
it("chooses the lowest-readiness project as the next review action", () => {})
it("labels registry, institutional, event, and telemetry origins independently", () => {})
```

Use small plain fixtures defined in the test file; do not construct raw Prisma or domain entities.

- [ ] **Step 2: Run the presenter test and verify failure**

Run the same scoped Vitest command with `overview-presenter.test.ts`.

- [ ] **Step 3: Implement minimal deterministic presentation**

Required output shape:

```ts
export interface HubOverviewVM {
  readonly generatedAt: string
  readonly portfolio: readonly HubPortfolioItemVM[]
  readonly health: HubHealthSummaryVM
  readonly attention: readonly HubAttentionItemVM[]
  readonly activity: readonly HubActivityItemVM[]
  readonly flow: readonly HubFlowNodeVM[]
  readonly nextAction: HubActionVM
  readonly origins: readonly HubDataOriginVM[]
}
```

The presenter receives `generatedAt` as input so tests are deterministic. Empty arrays remain empty and generate explicit ViewModel copy.

- [ ] **Step 4: Run both environment unit tests**

Expected: PASS.

- [ ] **Step 5: Commit the presenter**

```text
git add apps/matriz-hub/src/ui/environment/types.ts apps/matriz-hub/src/ui/environment/overview-presenter.ts apps/matriz-hub/src/ui/environment/overview-presenter.test.ts
git commit -m "feat(hub): present operational overview data"
```

### Task 3: Alpha tokens, icon grammar, and semantic states

**Files:**

- Create: `apps/matriz-hub/src/ui/environment/icons.tsx`
- Create: `apps/matriz-hub/src/ui/environment/status.tsx`
- Create: `apps/matriz-hub/src/ui/environment/SurfaceState.tsx`
- Create: `apps/matriz-hub/src/ui/environment/hub-environment.css`
- Modify: `apps/matriz-hub/app/globals.css`

**Interfaces:**

- Consumes: `HubIconName`, `HubStatus`, and semantic state props.
- Produces: `HubIcon`, `StatusMark`, `StatusLabel`, `DataOrigin`, and `SurfaceState`.

- [ ] **Step 1: Add a compile-time icon coverage assertion**

Use `satisfies Record<HubIconName, ReactNode>` so missing icons fail typecheck.

- [ ] **Step 2: Implement the SVG icon grammar**

Requirements:

- 16/20/24 px sizes;
- `currentColor` only;
- decorative by default with `aria-hidden`;
- accessible label when requested;
- consistent 1.6 px stroke and square/hexagonal operational motifs.

- [ ] **Step 3: Implement semantic state primitives**

`StatusLabel` must include a shape/icon plus text. `DataOrigin` must expose source kind and persistence/freshness copy. `SurfaceState` supports `loading`, `empty`, `filtered`, `partial`, `error`, `denied`, `planned`, and `unavailable`.

- [ ] **Step 4: Implement Hub-only CSS tokens and base visuals**

Define `--hub-*` tokens for canvas, four surface depths, three text levels, lines, focus, state colors, spacing, radii, shadows, timings, header/nav/dock sizes. Include:

```css
@media (prefers-reduced-motion: reduce) {
  .hub-environment *, .hub-environment *::before, .hub-environment *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Import the stylesheet and run typecheck**

Expected: typecheck PASS.

- [ ] **Step 6: Commit the visual foundation**

```text
git add apps/matriz-hub/app/globals.css apps/matriz-hub/src/ui/environment
git commit -m "feat(hub): add alpha visual primitives"
```

### Task 4: Responsive shell and command navigation

**Files:**

- Create: `apps/matriz-hub/src/ui/environment/GlobalContextBar.tsx`
- Create: `apps/matriz-hub/src/ui/environment/OperationalNav.tsx`
- Create: `apps/matriz-hub/src/ui/environment/CommandSearch.tsx`
- Create: `apps/matriz-hub/src/ui/environment/OperationalDock.tsx`
- Modify: `apps/matriz-hub/src/ui/components/HubShell.tsx`
- Modify: `apps/matriz-hub/src/auth/provider.tsx`
- Modify: `apps/matriz-hub/src/ui/environment/hub-environment.css`

**Interfaces:**

- `HubShell({ children, session, onSignOut })`
- `session: { userName: string; email: string; tenantLabel?: string }`
- `onSignOut: () => void`

- [ ] **Step 1: Replace the separate session bar with shell props**

Build a serializable session display object inside `HubAuthShell`, pass it to `HubShell`, and keep `signOut` owned by auth adoption. Do not import capability/domain application code into `src/auth/**`.

- [ ] **Step 2: Implement the global context bar**

Display only truthful static/session context in Cycle 1:

- Matriz Hub;
- `Alpha local` environment;
- `Sessão local` source;
- current navigation group;
- command search trigger;
- authenticated user and sign-out.

Do not show CPU, region, branch, sync, or deployment state.

- [ ] **Step 3: Implement navigation states**

- desktop expanded/collapsed;
- mobile modal drawer;
- active item through `usePathname()` and `resolveActiveNavItem()`;
- `aria-current="page"`;
- Escape closes drawer/search;
- focus returns to the trigger;
- body scroll locks only while a modal surface is open.

- [ ] **Step 4: Implement command search**

- keyboard shortcut `/` and `Ctrl/Cmd+K`;
- filter by label, description, keywords, and group;
- arrow-key selection and Enter navigation;
- no command execution beyond route navigation in Cycle 1.

- [ ] **Step 5: Implement the operational dock**

Show `Sistema alpha`, `Registry em memória`, `Dados institucionais`, and the local time. Every label describes origin, not production health.

- [ ] **Step 6: Run typecheck and lint**

Expected: typecheck PASS. Lint may still report only the pre-existing `src/auth/actor-context.ts` boundary failure; do not introduce additional findings.

- [ ] **Step 7: Commit the shell**

```text
git add apps/matriz-hub/src/auth/provider.tsx apps/matriz-hub/src/ui/components/HubShell.tsx apps/matriz-hub/src/ui/environment
git commit -m "feat(hub): build responsive operational shell"
```

### Task 5: Real-data operational overview

**Files:**

- Create: `apps/matriz-hub/src/ui/environment/HubOverview.tsx`
- Modify: `apps/matriz-hub/app/page.tsx`
- Modify: `apps/matriz-hub/src/ui/environment/hub-environment.css`

**Interfaces:**

- Consumes: `HubOverviewVM` only.
- The route gathers snapshots from the technical registry, institutional registry, EventBus, and telemetry registry, then passes plain source data to `toHubOverviewVM`.

- [ ] **Step 1: Compose real source snapshots in the route**

Call `ensureInstitutionalBootstrapped()` before reading institutional projects. Map public DTOs to the small `HubOverviewSource` shape; do not pass registries or entities into `HubOverview`.

- [ ] **Step 2: Implement the primary workspace**

Desktop composition:

- portfolio rail;
- selected/featured operational context;
- project health reading;
- attention queue;
- integration flow summary;
- activity stream;
- next action;
- data-origin strip.

Cards are used only where the entire region is selectable. Routine readings use dividers, rows, rails, and grouped surfaces.

- [ ] **Step 3: Implement honest empty and partial states**

Events and telemetry show session-scoped absence. No fake sparklines, progress, agents, approvals, or deploys.

- [ ] **Step 4: Add responsive compositions**

- desktop: workspace + context rail;
- notebook: context below attention;
- tablet: single column with horizontal portfolio rail;
- mobile: ordered operational narrative and sticky local action only when actionable.

- [ ] **Step 5: Run unit tests, typecheck, and lint**

Expected: environment tests and typecheck PASS; no new lint findings.

- [ ] **Step 6: Commit the overview**

```text
git add apps/matriz-hub/app/page.tsx apps/matriz-hub/src/ui/environment
git commit -m "feat(hub): rebuild operational overview"
```

### Task 6: Global route states

**Files:**

- Create: `apps/matriz-hub/app/loading.tsx`
- Create: `apps/matriz-hub/app/error.tsx`
- Create: `apps/matriz-hub/app/not-found.tsx`
- Modify: `apps/matriz-hub/src/ui/environment/hub-environment.css`

**Interfaces:**

- Consumes: `SurfaceState`.
- `error.tsx` is a Client Component receiving `{ error, reset }`.

- [ ] **Step 1: Implement loading with semantic progress**

Use a stable workspace skeleton plus `role="status"` and `Carregando ambiente operacional`.

- [ ] **Step 2: Implement recoverable error boundary**

Show safe copy, a retry action calling `reset`, and a route-home link. Do not render `error.message` in production UI.

- [ ] **Step 3: Implement not found**

Use an orientation-first state with home, projects, and MatrizDocs destinations.

- [ ] **Step 4: Verify focus, contrast, and reduced motion manually**

- [ ] **Step 5: Commit route states**

```text
git add apps/matriz-hub/app/loading.tsx apps/matriz-hub/app/error.tsx apps/matriz-hub/app/not-found.tsx apps/matriz-hub/src/ui/environment
git commit -m "feat(hub): add global operational states"
```

### Task 7: Cycle 1 verification and visual QA

**Files:**

- Modify only files required by findings inside Cycle 1 scope.

**Interfaces:** none.

- [ ] **Step 1: Run environment unit tests**

```text
pnpm --filter @matriz/app-matriz-hub exec vitest run --config vitest.config.ts src/ui/environment/navigation.test.ts src/ui/environment/overview-presenter.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run Hub typecheck**

```text
pnpm --filter @matriz/app-matriz-hub typecheck
```

Expected: PASS.

- [ ] **Step 3: Run Hub lint**

```text
pnpm --filter @matriz/app-matriz-hub lint
```

Expected: PASS after resolving the pre-existing auth/capabilities boundary without weakening lint or moving domain code into auth.

- [ ] **Step 4: Run smoke tests**

```text
pnpm test:smoke
```

Expected: PASS.

- [ ] **Step 5: Run the Hub and verify in a real browser**

Check authenticated home, navigation, command search, drawer, error-safe copy, focus order, reduced motion, and overflow at 1440 × 1000, 1024 × 768, 768 × 1024, and 390 × 844.

- [ ] **Step 6: Compare against the five reference principles**

Confirm spatial hierarchy, restrained depth, dense readability, state identity, persistent context, and no fabricated operational readings.

- [ ] **Step 7: Review the diff boundary**

```text
git diff --name-only HEAD~6..HEAD
```

Expected: only `apps/matriz-hub/**` plus the approved docs.

- [ ] **Step 8: Record Cycle 1 outcome**

Update the master design status or create the Cycle 2 plan with exact findings. Do not claim the full alpha complete after Cycle 1.

---

## Plan Self-Review

- Spec coverage: Cycle 1 covers tokens, primitives, shell, navigation, global states, command search, responsive foundation, and real-data overview.
- Deferred by explicit decomposition: architecture map, route-family migrations, MatrizDocs, Praticies integration, roadmap, agents, releases, and final cross-route QA belong to Cycles 2–6.
- Boundary check: all implementation remains in `apps/matriz-hub`.
- Data integrity: no planned UI reading is presented as a real runtime state.
- Type consistency: shell, navigation, status, source, and overview interfaces are defined before their consumers.
