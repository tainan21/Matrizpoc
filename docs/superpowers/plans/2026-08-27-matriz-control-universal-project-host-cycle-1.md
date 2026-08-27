# Matriz Control Universal Project Host Cycle 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete Node/web external-project vertical slice in Matriz Control, from native folder selection through safe inspection, recipe approval, optional preparation, supervised lifecycle, readiness, embedded/external opening, persistence, reconciliation, and catalog-only removal.

**Architecture:** `apps/matriz-control/src/modules/projects` owns Project Host domain/application/presentation contracts and delegates native authority through ports. Electron main owns canonical roots, persistence, and surfaces; the existing `TerminalSupervisor` remains the only process authority and resolves approved Project Host actions through an injected resolver.

**Tech Stack:** TypeScript 5.6, Next.js 16 App Router, React 19, Electron 44, Node child processes/filesystem/HTTP, Zod 3, Vitest 2.

**Spec:** `docs/superpowers/specs/2026-08-27-matriz-control-universal-project-host-cycle-1-design.md`

## Global Constraints

- Product code stays inside `apps/matriz-control/**`; only the approved spec/plan and final governance entry may be outside the app.
- Never import another app's `src/**` or `app/**`; do not create a shared package.
- Renderer commands contain IDs, revisions, and confirmation tokens only—never paths, executables, arguments, ports, URLs, environment maps, or environment values.
- Inspection is bounded and read-only; registration never prepares or starts a project.
- Only the existing `TerminalSupervisor` owns process handles; foreign listeners are never stopped by port.
- UI consumes Project Host ViewModels, not domain entities.
- Apply TDD to each behavior and preserve all pre-existing user changes.

---

### Task 1: Project Host domain contracts and invariants

**Files:**
- Create: `apps/matriz-control/src/modules/projects/domain/project.ts`
- Create: `apps/matriz-control/src/modules/projects/domain/recipe.ts`
- Create: `apps/matriz-control/src/modules/projects/domain/state-machine.ts`
- Create: `apps/matriz-control/src/modules/projects/domain/permissions.ts`
- Test: `apps/matriz-control/src/modules/projects/domain/project.test.ts`
- Test: `apps/matriz-control/src/modules/projects/domain/recipe.test.ts`
- Test: `apps/matriz-control/src/modules/projects/domain/state-machine.test.ts`

**Interfaces:**
- Produces `ProjectRegistration`, `ProjectRecipe`, `ProjectAction`, `ProjectSurface`, `ProjectState`, `ProjectPermission`, `ProjectSessionRecord`, `transitionProject`, `approveRecipe`, and deterministic `computeRecipeRevision`.
- No absolute path field exists in renderer-visible contracts.

- [ ] Write failing tests for every state, allowed/denied transitions, independent permissions, immutable approvals, and deterministic revision hashing.
- [ ] Run `corepack pnpm --filter @matriz/app-matriz-control test -- src/modules/projects/domain` and verify failures identify missing contracts.
- [ ] Implement minimal immutable contracts, transition table, approval validation, and normalized SHA-256 revision input.
- [ ] Re-run the focused tests and verify all pass.
- [ ] Commit only Task 1 files with `feat(control): add project host domain`.

### Task 2: Root safety and bounded inspection

**Files:**
- Create: `apps/matriz-control/src/modules/projects/domain/root-policy.ts`
- Create: `apps/matriz-control/src/modules/projects/domain/root-policy.test.ts`
- Create: `apps/matriz-control/src/modules/projects/ports.ts`
- Create: `apps/matriz-control/src/modules/projects/integration/bounded-project-reader.ts`
- Create: `apps/matriz-control/src/modules/projects/integration/bounded-project-reader.test.ts`

**Interfaces:**
- Produces `RootCandidatePort`, `ProjectRootStorePort`, `ProjectFileReaderPort`, `InspectionLimits`, `assertAllowedCanonicalRoot`, `canonicalRootKey`, and `BoundedProjectReader.readEvidence(rootRef)`.
- Default limits are depth 4, 2,000 entries, 8 MiB total, 1 MiB per file, and 5 seconds.

- [ ] Write failing Windows policy tests for filesystem root, full home, Windows, System32, Program Files, credential directories, case-insensitive dedupe, and allowed ordinary directories.
- [ ] Write failing temporary-directory tests proving depth/file/byte/deadline bounds and junction/symlink escape rejection.
- [ ] Run the focused tests and confirm failures.
- [ ] Implement policy and reader using `realpath`, containment checks, allowlisted detector filenames, and abortable limits without executing files.
- [ ] Re-run tests and confirm the fixture contents and timestamps are unchanged.
- [ ] Commit Task 2 files with `feat(control): bound external project inspection`.

### Task 3: Node detector, recipe materialization, and redaction

**Files:**
- Create: `apps/matriz-control/src/modules/projects/integration/node-project-detector.ts`
- Create: `apps/matriz-control/src/modules/projects/integration/node-project-detector.test.ts`
- Create: `apps/matriz-control/src/modules/projects/domain/redaction.ts`
- Create: `apps/matriz-control/src/modules/projects/domain/redaction.test.ts`

**Interfaces:**
- Produces `detectNodeProject(evidence): ProjectRecipeCandidate`, preparation candidates for exact pnpm/npm/bun commands, run-action candidates from package scripts, conflict evidence, HTTP readiness candidates, and `redactProjectOutput`.

- [ ] Write failing tests for pnpm/npm/bun detection, conflicting lockfiles, missing scripts, workspace metadata, explicit lifecycle warnings, candidate ports, and zero execution during detection.
- [ ] Write failing redaction tests for secret assignments, bearer/authorization headers, credential URLs, case variants, and benign lines.
- [ ] Run focused tests and confirm failures.
- [ ] Implement strict JSON parsing, candidate-only recipes, deterministic evidence ordering, and bounded redaction.
- [ ] Re-run focused tests and commit with `feat(control): detect node project recipes`.

### Task 4: Atomic native catalog and recipe invalidation

**Files:**
- Create: `apps/matriz-control/src/modules/projects/integration/atomic-project-store.ts`
- Create: `apps/matriz-control/src/modules/projects/integration/atomic-project-store.test.ts`
- Create: `apps/matriz-control/src/modules/projects/application/project-host-service.ts`
- Create: `apps/matriz-control/src/modules/projects/application/project-host-service.test.ts`

**Interfaces:**
- Produces `AtomicProjectStore`, `ProjectHostService.inspect/register/approve/list/remove/reconcile`, protected native records, and sanitized records.
- Store format is versioned, written through temp-file plus rename, and never persists secrets, tokens, unlimited logs, or renderer-provided commands.

- [ ] Write failing tests for atomic persistence, restart reload, canonical-root dedupe, catalog corruption, removal preserving project files, and bounded session history.
- [ ] Write failing service tests for inspect→needs_review, approve→ready, stale revision rejection, changed manifest invalidation, web-mode registration denial, and path-free output.
- [ ] Run focused tests and confirm failures.
- [ ] Implement minimal repository and service with clock/ID/token ports for deterministic tests.
- [ ] Re-run tests and commit with `feat(control): persist reviewed project recipes`.

### Task 5: Preparation preview and one-use confirmation

**Files:**
- Create: `apps/matriz-control/src/modules/projects/application/project-preparation-service.ts`
- Create: `apps/matriz-control/src/modules/projects/application/project-preparation-service.test.ts`

**Interfaces:**
- Produces `preview(projectId, revision)` returning a sanitized preview and short-lived token, and `prepare(projectId, revision, token)` resolving the exact approved action through a native executor port.

- [ ] Write failing tests for no preparation during inspect/register, token expiry, token reuse, stale revision, mismatched project, lifecycle warning, and exact executable/args resolution outside renderer input.
- [ ] Run focused tests and confirm failures.
- [ ] Implement single-use in-memory confirmations with 2-minute expiry and fail-closed validation.
- [ ] Re-run tests and commit with `feat(control): require confirmed project preparation`.

### Task 6: Supervisor ownership, safe spawn, readiness, and reconciliation

**Files:**
- Modify: `apps/matriz-control/src/domain/terminal.ts`
- Modify: `apps/matriz-control/src/application/terminal-supervisor.ts`
- Modify: `apps/matriz-control/src/application/terminal-supervisor.test.ts`
- Create: `apps/matriz-control/src/modules/projects/integration/project-readiness.ts`
- Create: `apps/matriz-control/src/modules/projects/integration/project-readiness.test.ts`
- Create: `apps/matriz-control/src/modules/projects/application/project-session-service.ts`
- Create: `apps/matriz-control/src/modules/projects/application/project-session-service.test.ts`

**Interfaces:**
- `TerminalSupervisor` accepts a composite action resolver and returns owned session IDs/PIDs without accepting raw commands from callers.
- Produces `ProjectReadinessProbe.wait`, port-conflict observation, project session start/stop/restart, and persisted reconciliation result.

- [ ] Write failing supervisor tests proving no argument joining/interpolation, idempotent concurrent start, graceful owned-tree stop, foreign-listener protection, bounded/redacted logs, and restart correlation.
- [ ] Write failing readiness tests for HTTP success, early exit, timeout, exact loopback only, and observed unapproved port.
- [ ] Write failing session-service tests for stale recipe checks, honest state mapping, and disappeared-process reconciliation.
- [ ] Run focused tests and confirm failures.
- [ ] Implement `.cmd` executable resolution without shell interpolation, owned handle tracking, readiness polling, and service orchestration.
- [ ] Re-run focused tests and commit with `feat(control): supervise approved external projects`.

### Task 7: Strict desktop intents and native composition

**Files:**
- Modify: `apps/matriz-control/src/domain/desktop-bridge.ts`
- Modify: `apps/matriz-control/src/domain/desktop-command.test.ts`
- Modify: `apps/matriz-control/desktop/main.ts`
- Create: `apps/matriz-control/desktop/electron-project-adapters.ts`
- Create: `apps/matriz-control/src/integration/desktop/electron-project-adapters.test.ts`
- Modify: `apps/matriz-control/src/bootstrap/index.ts`
- Create: `apps/matriz-control/src/modules/projects/facade.ts`
- Create: `apps/matriz-control/src/modules/projects/public.ts`

**Interfaces:**
- Adds only the typed `ProjectIntent` union from the spec, strict extra-key rejection, human-only mutation gates, native folder picker, root vault, atomic user-data catalog, supervisor adapter, and event snapshots.

- [ ] Write failing parser tests that reject raw path/command/args/env/port/URL and agent mutation attempts.
- [ ] Write failing adapter tests for opaque picker result, forbidden roots, dedupe, restart persistence, and removal without deletion.
- [ ] Run focused tests and confirm failures.
- [ ] Compose the project facade in Electron main and web-safe read facade in bootstrap; do not expose native adapters to Next server routes.
- [ ] Re-run focused tests and `desktop:compile`; commit with `feat(control): expose typed project host intents`.

### Task 8: Exact-loopback embedded surface and external fallback

**Files:**
- Create: `apps/matriz-control/desktop/project-surface-host.ts`
- Create: `apps/matriz-control/src/integration/desktop/project-surface-policy.ts`
- Create: `apps/matriz-control/src/integration/desktop/project-surface-policy.test.ts`
- Modify: `apps/matriz-control/desktop/main.ts`

**Interfaces:**
- Produces exact-origin URL resolution, header compatibility decision, isolated `WebContentsView` lifecycle, and fallback result `embedded | external | service_only`.

- [ ] Write failing policy tests for localhost/127.0.0.1 exact origins, rejected host/origin drift, unsafe schemes, X-Frame-Options, CSP frame-ancestors, popups, downloads, and permissions.
- [ ] Run focused tests and confirm failures.
- [ ] Implement isolated partition, sandbox/context isolation/no Node integration, navigation and permission denial, readiness-before-mount, and `shell.openExternal` fallback using native-resolved URL only.
- [ ] Re-run tests and `desktop:compile`; commit with `feat(control): host approved loopback surfaces`.

### Task 9: Project ViewModels and shell UI

**Files:**
- Create: `apps/matriz-control/src/modules/projects/presentation/project-presenter.ts`
- Create: `apps/matriz-control/src/modules/projects/presentation/project-presenter.test.ts`
- Create: `apps/matriz-control/src/ui/projects/project-library.tsx`
- Create: `apps/matriz-control/src/ui/projects/project-library.test.tsx`
- Create: `apps/matriz-control/src/ui/projects/project-workspace.tsx`
- Create: `apps/matriz-control/src/ui/projects/project-workspace.test.tsx`
- Create: `apps/matriz-control/src/ui/projects/add-project-wizard.tsx`
- Create: `apps/matriz-control/src/ui/projects/project-host-context.tsx`
- Modify: `apps/matriz-control/src/ui/apps-console.tsx`
- Modify: `apps/matriz-control/src/ui/workspace/workspace-page.tsx`
- Modify: `apps/matriz-control/app/home/page.tsx`
- Modify: `apps/matriz-control/src/ui/terminal/terminal-context.tsx`
- Modify: `apps/matriz-control/src/ui/control-shell.tsx`

**Interfaces:**
- Produces path-free `ProjectViewModel`, wizard state, dense library, contextual inspector, workspace sections, Home summaries, and existing Terminal session integration.

- [ ] Write failing presenter tests for every state and attention reason, masked cwd, environment names without values, bounded logs, and no entities/paths.
- [ ] Write failing UI tests for the six-step wizard, empty/loading/preparing/conflict/stale/timeout/early-exit/incompatible states, ID-only bridge commands, and remove-without-delete wording.
- [ ] Run focused tests and confirm failures.
- [ ] Implement the smallest coherent UI using existing shell styles and components; do not create a second navigation shell.
- [ ] Run focused tests, lint, and typecheck; commit with `feat(control): add project host workspace`.

### Task 10: External fixtures and desktop acceptance

**Files:**
- Create: `apps/matriz-control/src/modules/projects/test/external-node-fixtures.ts`
- Create: `apps/matriz-control/src/modules/projects/integration/project-host.integration.test.ts`
- Create: `apps/matriz-control/desktop/project-host.e2e.test.ts`

**Interfaces:**
- Creates temporary fixtures outside the repository at test runtime and removes only those exact temp directories after assertions.

- [ ] Write integration tests for two external Node projects, pnpm/npm/bun detection without install, start/readiness/embed/open/stop, conflict, early death, timeout, child tree, restart/reconcile, junction escape, manifest drift, and synthetic-secret redaction.
- [ ] Write desktop acceptance coverage for opaque picker, strict IPC, foreign process, persistence restart, navigation/permission denial, and registration removal preserving files.
- [ ] Run tests and verify fixtures reside outside the monorepo and leave no artifacts.
- [ ] Commit with `test(control): prove external project host lifecycle`.

### Task 11: Documentation, threat model, and full gates

**Files:**
- Modify: `apps/matriz-control/README.md`
- Modify: `apps/matriz-control/docs/AGENT-START-HERE.md`
- Create: `apps/matriz-control/docs/PROJECT-HOST.md`
- Create: `apps/matriz-control/docs/PROJECT-HOST-THREAT-MODEL.md`
- Create: `apps/matriz-control/docs/PROJECT-HOST-TROUBLESHOOTING.md`
- Modify: `docs/DECISION-LOG.md`

**Interfaces:**
- Documents actual delivered behavior, remaining risk, ownership, limits, stacks/ports/readiness/embedding troubleshooting, and why universal discovery is not unrestricted execution.

- [ ] Document only implemented behavior and the native/renderer/MCP authority matrix.
- [ ] Run `corepack pnpm --filter @matriz/app-matriz-control test`.
- [ ] Run `corepack pnpm --filter @matriz/app-matriz-control lint`.
- [ ] Run `corepack pnpm --filter @matriz/app-matriz-control typecheck`.
- [ ] Run `corepack pnpm --filter @matriz/app-matriz-control build`.
- [ ] Run `corepack pnpm test:smoke`.
- [ ] Run `corepack pnpm tsx tooling/scripts/verify-app-boundaries.ts`.
- [ ] Run `git diff --check` and inspect `git status --short` for generated artifacts or unrelated changes.
- [ ] Run the real Electron twelve-step acceptance flow and then `desktop:build`; record exact evidence and any environmental limitation without claiming success for unrun checks.
- [ ] Commit documentation and verified evidence with `docs(control): document universal project host`.

