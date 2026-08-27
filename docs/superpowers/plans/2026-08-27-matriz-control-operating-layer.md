# Matriz Control Operating Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Matriz Control into an operational home with native Git control, an intelligent trusted-extension Store, and Health as the first capability that mutates Control navigation.

**Architecture:** Add app-local capability modules for activity, extensions, Git, and Home. Electron remains the authority for privileged persistence and mutations; the renderer consumes typed snapshots/ViewModels and submits only validated identifiers and intent.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.6, Electron 44, Node child-process Git adapter, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-27-matriz-control-operating-layer-design.md`

## Global Constraints

- Never import another app's `src/**` or `app/**`; Health is consumed through its manifest and loopback runtime only.
- Do not introduce a shared package or dynamic remote-code loader.
- Renderer commands contain stable IDs and typed selections, never raw commands, env maps, arbitrary repository paths, installer URLs, or permissions.
- Preserve all existing dirty-worktree changes and keep new implementation app-local unless the existing Health owner must change.
- UI consumes ViewModels; composition occurs in `apps/matriz-control/src/bootstrap/index.ts`.
- Destructive Git mutations require a fresh preview token; force push uses `--force-with-lease` only.
- Store mutations and destructive Git operations stay outside the agent/MCP allowlist.

---

### Task 1: Trusted extension registry and activity ledger

**Files:**
- Create: `apps/matriz-control/src/modules/extensions/{domain,application,integration,presentation}/*`, `public.ts`
- Create: `apps/matriz-control/src/modules/activity/{domain,application,integration}/*`, `public.ts`
- Modify: `apps/matriz-control/src/bootstrap/index.ts`, `apps/matriz-control/src/domain/desktop-bridge.ts`, `apps/matriz-control/desktop/main.ts`
- Test: colocated `*.test.ts`

**Interfaces:**
- Produces `ExtensionDefinition`, `ExtensionReceipt`, `ExtensionRegistrySnapshot`, `ExtensionFacade`, `ActivityEntry`, and `ActivityFacade`.
- `ExtensionFacade` exposes `catalog()`, `snapshot()`, `install(id)`, `activate(id)`, `deactivate(id)`, and `uninstall(id)`.

- [ ] Write failing tests for catalog validation, compatibility/dependency checks, active contribution derivation, deactivation/uninstall ordering, receipt migration, activity sanitization, and 200-entry retention.
- [ ] Implement pure domain functions and rerun the focused tests.
- [ ] Implement atomic Electron-user-data receipt/activity adapters plus memory fallbacks and rerun adapter tests.
- [ ] Add schema-validated IPC commands/events; prove Store/extension mutations remain rejected by `assertAgentDesktopCommand`.
- [ ] Compose facades in bootstrap/main and run the full Control test suite.
- [ ] Commit only Task 1 files with `feat(control): add trusted extension registry`.

### Task 2: Native Git domain and adapter

**Files:**
- Create: `apps/matriz-control/src/modules/git/domain/*`, `application/*`, `integration/git-cli-repository.ts`, `presentation/*`, `public.ts`
- Modify: `apps/matriz-control/src/domain/desktop-bridge.ts`, `apps/matriz-control/desktop/main.ts`
- Test: Git module tests using temporary repositories

**Interfaces:**
- Produces `GitFacade` queries for overview, branches, history, diff, compare, conflicts, reflog, plus typed mutation commands and destructive preview/execute.
- Every snapshot includes `repositoryId`, `revision`, `sampledAt`, and `stale`.

- [ ] Write fixture helpers that initialize temporary repositories with local/remote branches, staged/unstaged/untracked files, merges, divergence, conflicts, and reflog states.
- [ ] Write failing parser/domain tests for porcelain-v2 status, `for-each-ref`, log graph, numstat/name-status diffs, conflicts, detached HEAD, worktrees, and non-UTF8/binary paths.
- [ ] Implement direct `execFile("git", args)` adapter with canonical-root validation, time/output limits, disabled prompts, safe environment, per-repository serialization, and structured errors.
- [ ] Write failing mutation tests for stage/unstage file and hunk, commit/amend, branch lifecycle, fetch/pull/push/upstream, merge/rebase continue/abort, conflict choices, compare, and reflog recovery.
- [ ] Implement mutations and ensure each refreshes state and appends sanitized activity.
- [ ] Write and implement expiring destructive previews bound to operation, repository, revision, and impact; reject stale/replayed tokens.
- [ ] Add human-only IPC schemas and run Git tests plus the complete Control suite.
- [ ] Commit Task 2 files with `feat(control): add native git operations`.

### Task 3: Git operational UI

**Files:**
- Create: `apps/matriz-control/app/git/page.tsx`, `src/modules/git/presentation/components/*`, `git-workspace.module.css`
- Modify: `apps/matriz-control/src/ui/control-shell.tsx`, `apps/matriz-control/src/manifest/manifest.ts`
- Test: presenter and interaction tests

**Interfaces:**
- Consumes only Git ViewModels and bridge commands from Task 2.
- Produces `/git` with Overview, Changes, Commits, Branches, Compare, Merge, Conflicts, and Recovery modes.

- [ ] Write failing presenter tests for status labels, attention ranking, graph lanes, diff/hunk rendering, destructive impact, and error/stale states.
- [ ] Implement the Git workspace shell, repository header, mode navigation, primary content pane, and contextual inspector.
- [ ] Implement staging, commits, branch management, synchronization, compare/merge/conflicts, destructive confirmation, and recovery interactions.
- [ ] Add keyboard/focus, reduced-motion, narrow-layout, loading/empty/error behavior and utility Portuguese copy.
- [ ] Run focused UI tests, lint, typecheck, and build; visually verify all Git modes against the supplied references.
- [ ] Commit Task 3 files with `feat(control): add git workspace interface`.

### Task 4: Operational Home

**Files:**
- Create: `apps/matriz-control/src/modules/home/{domain,application,integration,presentation}/*`, `public.ts`, `apps/matriz-control/app/home/page.tsx`
- Modify: `apps/matriz-control/app/page.tsx`, `src/ui/control-shell.tsx`, `src/manifest/manifest.ts`, relevant runtime/Doctor providers
- Test: Home facade, presenter, and page tests

**Interfaces:**
- `HomeFacade.snapshot()` returns independent provider results for context, runtime, Git, Doctor, Store/extensions, Health, preview, activity, and quick actions.

- [ ] Write failing aggregation tests for concurrent providers, timeout, partial failure, stale data, severity/recency ranking, and empty state.
- [ ] Implement provider ports/adapters over existing Control facades without duplicating their domain rules.
- [ ] Implement the Home presenter and `/home`; redirect `/` to `/home` and place INÍCIO before existing navigation.
- [ ] Build the current-context band, attention/next-actions workspace, recent activity, runtime/preview state, Health widget, and compact Git workspace.
- [ ] Validate real-data, empty, partial-failure, loading, narrow desktop, keyboard, and reduced-motion states.
- [ ] Commit Task 4 files with `feat(control): add operational home`.

### Task 5: Store intelligence and lifecycle migration

**Files:**
- Modify: existing Store catalog/service/context/presenter/UI and Electron adapters under `apps/matriz-control`
- Create: Store receipt migration and detail/lifecycle components under the extensions module
- Test: Store service, context migration, presenter, and interaction tests

**Interfaces:**
- Store catalog consumes extension definitions and native package snapshots; it exposes Adds/Requires/Changes plus lifecycle actions.

- [ ] Write failing tests that migrate `matriz-control:installed-apps:v1` into receipts without losing active Health state.
- [ ] Replace activation-only browser state with the extension facade while retaining a safe web-memory fallback.
- [ ] Expand lifecycle states, compatibility/dependency/permission results, update/deactivate flows, and rollback behavior.
- [ ] Redesign Store around catalog/list/detail and effect disclosure instead of independent product cards.
- [ ] Verify existing Workbench/Seumei signed installer behavior and Health activation remain compatible.
- [ ] Commit Task 5 files with `feat(control): evolve store capability lifecycle`.

### Task 6: Health as the first shell mutation

**Files:**
- Modify: `apps/health` manifest, routes/presenters/UI as required for Overview and Resources
- Modify: Control Health catalog definition, shell contribution renderer, Home and Doctor adapters
- Test: Health and Control integration tests

**Interfaces:**
- Health contributes `System Health > Overview` and `Resources`, `health.widget.system`, and a read-only Doctor provider through declarative metadata and the existing versioned host bridge.

- [ ] Write failing registry/shell tests proving inactive Health contributes nothing and active Health contributes exactly the declared group/items/widget/provider.
- [ ] Extend the Health manifest/routes and split its UI into Overview and Resources without exposing internals to Control.
- [ ] Extend the typed host bridge only for Control-owned metrics; keep CPU/RAM/storage/process/temperature observation Health-owned and read-only.
- [ ] Add Home summary and Doctor observation integration with explicit unavailable states.
- [ ] Exercise install, activate, navigate, deactivate, reactivate, and uninstall end to end in tests.
- [ ] Commit Task 6 files with `feat(control): activate health shell capability`.

### Task 7: Integration, governance, and desktop acceptance

**Files:**
- Modify: Control/Health README, manifests, decision log, and change-safety documentation only where behavior or boundaries changed
- Test: scoped suites, smoke, boundaries, builds, and installed desktop checklist

- [ ] Run Control and Health tests, lint, typecheck, and builds; fix failures by root cause.
- [ ] Because manifests/contracts/root config may be touched, run `pnpm test:smoke` and `pnpm tsx tooling/scripts/verify-app-boundaries.ts`; run global lint/typecheck only if root or shared configuration changed.
- [ ] Run `git diff --check` and audit imports, IPC schemas, MCP denials, secrets, generated files, logs, caches, and screenshots.
- [ ] Start the real Electron development runtime and verify Home, all Git modes, destructive preview rejection, Store lifecycle, Health mutation, Doctor/Home integration, and restart persistence.
- [ ] Build/package the Windows app and verify the packaged renderer/bridge; if signing/channel configuration is absent, record the expected unavailable state rather than bypassing trust.
- [ ] Perform the second UX pass using the supplied images as references, fixing hierarchy, density, focus, contrast, empty/error states, and copy.
- [ ] Record the architectural decision and update ownership/usage docs; commit with `docs(control): document operating layer`.

