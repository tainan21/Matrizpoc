# Matriz Control Operations Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Doctor resource control followed by Git prompt, short navigation, terminal metrics, Workspace, and safe ecosystem startup inside Matriz Control.

**Architecture:** Keep OS inspection behind app-local adapters and compose safe application services over the existing validated project catalog and terminal supervisor. Route handlers expose presenter-produced JSON and mutations use server-issued identifiers or preview tokens only.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.6, Node.js APIs, Vitest 2, PowerShell 5/7.

**Spec:** `docs/superpowers/specs/2026-08-25-matriz-control-operations-suite-design.md`

## Global Constraints

- All implementation remains inside `apps/matriz-control`, except the two existing user PowerShell profile files.
- Never accept raw paths, commands, environment maps, or arbitrary PIDs from browser requests.
- Never delete `node_modules`, source, `.git`, `.env*`, databases, uploads, or user-authored files.
- UI consumes view models; physical paths and raw OS records remain server-only.
- Measurements may be `unknown`; they must never silently become zero.
- Run app test, lint, typecheck, build, root smoke tests, and browser verification.

---

### Task 1: Doctor contracts and bounded system inspection

**Files:**
- Create: `apps/matriz-control/src/domain/doctor.ts`
- Create: `apps/matriz-control/src/integration/system/system-inspector.ts`
- Create: `apps/matriz-control/src/integration/system/system-inspector.test.ts`
- Modify: `apps/matriz-control/src/application/terminal-supervisor.ts`

**Interfaces:**
- Produces: `SystemInspector.snapshot(rootDir, projects, sessions): Promise<SystemSnapshot>` and byte/status contracts.
- Consumes: `TerminalProject[]` and `TerminalSession[]` from existing domain contracts.

- [ ] **Step 1: Write failing tests** proving lowercase project attribution, `unknown` on permission failure, drive thresholds, bounded cache categories, process-tree RAM aggregation, and no secret/command-line fields in returned snapshots.
- [ ] **Step 2: Run** `corepack pnpm --filter @matriz/app-matriz-control test -- src/integration/system/system-inspector.test.ts` and confirm failures are missing contracts/inspector behavior.
- [ ] **Step 3: Implement minimal contracts and inspector** using injected filesystem/process/drive probes so tests use literal fixtures. Allow only `.next`, `.turbo`, and declared cache names.
- [ ] **Step 4: Run the focused tests** and confirm all pass.
- [ ] **Step 5: Commit** `feat(matriz-control): inspect project resources safely`.

### Task 2: Doctor service, cleanup preview, API, presenter, and page

**Files:**
- Create: `apps/matriz-control/src/application/doctor-service.ts`
- Create: `apps/matriz-control/src/application/doctor-service.test.ts`
- Create: `apps/matriz-control/src/ui/doctor/doctor-presenter.ts`
- Create: `apps/matriz-control/src/ui/doctor/doctor-presenter.test.ts`
- Create: `apps/matriz-control/src/ui/doctor/doctor-page.tsx`
- Create: `apps/matriz-control/app/api/doctor/route.ts`
- Create: `apps/matriz-control/app/api/doctor/cleanup/route.ts`
- Modify: `apps/matriz-control/app/doctor/page.tsx`
- Modify: `apps/matriz-control/app/globals.css`

**Interfaces:**
- Produces: `DoctorService.getSnapshot()`, `previewCleanup(projectId, category)`, `confirmCleanup(token)` and `DoctorViewModel`.
- Consumes: Task 1 `SystemInspector`, validated project catalog, and active terminal sessions.

- [ ] **Step 1: Write failing service tests** for 30-second snapshot cache, token expiry, containment recheck, active-session rejection, category allowlist, and exact reclaimable bytes.
- [ ] **Step 2: Run focused service tests** and confirm expected failures.
- [ ] **Step 3: Implement service and routes** with memory-only random preview tokens and same-origin enforcement.
- [ ] **Step 4: Write failing presenter tests** using literal `healthy/warning/critical/unknown` fixtures and verifying formatted GB/MB, remediation text, and absence of physical paths.
- [ ] **Step 5: Implement presenter and Doctor page** with summary cards, per-project table, expandable categories, refresh, preview modal, and explicit cleanup confirmation.
- [ ] **Step 6: Run Doctor tests and app test suite**.
- [ ] **Step 7: Commit** `feat(matriz-control): deliver doctor resource control`.

### Task 3: Minimal Git prompt and validated navigation

**Files:**
- Create: `apps/matriz-control/scripts/powershell/mih-profile.ps1`
- Create: `apps/matriz-control/scripts/powershell/mih-profile.test.ps1`
- Create: `apps/matriz-control/scripts/generate-navigation-catalog.ts`
- Create: `apps/matriz-control/scripts/generate-navigation-catalog.test.ts`
- Modify: `C:/Users/taina/OneDrive/Documentos/PowerShell/Microsoft.PowerShell_profile.ps1`
- Modify: `C:/Users/taina/OneDrive/Documentos/WindowsPowerShell/Microsoft.PowerShell_profile.ps1`

**Interfaces:**
- Produces: cached prompt `ps mih [branch*]>`, `mih [project-id]`, and a generated identifier-to-path catalog.
- Consumes: validated project catalog only; no browser inputs.

- [ ] **Step 1: Write failing catalog tests** for exact lowercase aliases, containment, unknown project rejection, and stable JSON output without commands.
- [ ] **Step 2: Implement catalog generator** and run its tests.
- [ ] **Step 3: Write PowerShell behavior tests** for root/subpath prompt, clean/dirty branch suffix, non-Git fallback, `mih control`, `mih hub`, and unknown-name no-op in both PowerShell 5 and 7.
- [ ] **Step 4: Implement shared profile script** with a short-lived Git cache and make both existing profiles dot-source it without removing current user aliases.
- [ ] **Step 5: Run both PowerShell test matrices** and the app test suite.
- [ ] **Step 6: Commit repository-owned generator/profile support** as `feat(matriz-control): add fast prompt and project navigation`; personal profile changes remain uncommitted machine configuration.

### Task 4: Resource-aware terminal view model

**Files:**
- Modify: `apps/matriz-control/src/domain/terminal.ts`
- Modify: `apps/matriz-control/src/application/terminal-supervisor.ts`
- Modify: `apps/matriz-control/src/application/terminal-supervisor.test.ts`
- Create: `apps/matriz-control/src/ui/terminal/terminal-presenter.ts`
- Create: `apps/matriz-control/src/ui/terminal/terminal-presenter.test.ts`
- Modify: `apps/matriz-control/src/ui/terminal/terminal-context.tsx`
- Modify: `apps/matriz-control/src/ui/terminal/terminal-dock.tsx`
- Modify: `apps/matriz-control/src/ui/terminal/terminal-page.tsx`

**Interfaces:**
- Produces: terminal view model fields `route`, `portLabel`, `elapsedLabel`, `memoryLabel`, `resourceStatus`, and `validationLabel`.
- Consumes: Task 1 process metrics and existing supervisor lifecycle.

- [ ] **Step 1: Write failing supervisor/presenter tests** for elapsed time, aggregate RAM, unknown fallback, declared port, and stale validation display.
- [ ] **Step 2: Run tests and confirm behavior failures**.
- [ ] **Step 3: Implement slower metric refresh independent of output polling** and presenter mapping.
- [ ] **Step 4: Update dock/page rendering** with accessible compact metadata and no raw OS records.
- [ ] **Step 5: Run terminal and full app tests**.
- [ ] **Step 6: Commit** `feat(matriz-control): enrich terminal operations`.

### Task 5: Operational Workspace

**Files:**
- Create: `apps/matriz-control/src/domain/workspace.ts`
- Create: `apps/matriz-control/src/application/workspace-service.ts`
- Create: `apps/matriz-control/src/application/workspace-service.test.ts`
- Create: `apps/matriz-control/src/ui/workspace/workspace-presenter.ts`
- Create: `apps/matriz-control/src/ui/workspace/workspace-presenter.test.ts`
- Create: `apps/matriz-control/src/ui/workspace/workspace-page.tsx`
- Create: `apps/matriz-control/app/api/workspace/route.ts`
- Modify: `apps/matriz-control/app/workspace/page.tsx`
- Modify: `apps/matriz-control/app/globals.css`

**Interfaces:**
- Produces: `WorkspaceService.snapshot()` and filterable `WorkspaceViewModel`.
- Consumes: Doctor snapshot, terminal sessions, validation records, and project catalog.

- [ ] **Step 1: Write failing service/presenter tests** for joining by canonical project ID, deterministic sorting, attention/running/dirty/resource filters, and partial-data states.
- [ ] **Step 2: Implement read model, route, and presenter** without duplicating OS inspection.
- [ ] **Step 3: Build Workspace table/detail UI** linking only to existing Doctor, Terminal, and Apps actions.
- [ ] **Step 4: Run focused and full app tests**.
- [ ] **Step 5: Commit** `feat(matriz-control): build operational workspace`.

### Task 6: Safe ecosystem startup profiles

**Files:**
- Create: `apps/matriz-control/src/domain/startup-profile.ts`
- Create: `apps/matriz-control/src/application/startup-service.ts`
- Create: `apps/matriz-control/src/application/startup-service.test.ts`
- Create: `apps/matriz-control/src/ui/startup/startup-panel.tsx`
- Create: `apps/matriz-control/app/api/startup/preview/route.ts`
- Create: `apps/matriz-control/app/api/startup/confirm/route.ts`
- Create: `apps/matriz-control/app/api/startup/stop/route.ts`
- Modify: `apps/matriz-control/src/ui/apps-console.tsx`
- Modify: `apps/matriz-control/src/application/terminal-supervisor.ts`

**Interfaces:**
- Produces: profiles `core` and `products`, preview tokens, sequential start, selective rollback, and selective stop.
- Consumes: validated project/action catalog and existing supervisor `start/stop` methods.

- [ ] **Step 1: Write failing orchestration tests** for unknown projects, occupied/duplicate ports, already-running preservation, sequential starts, rollback of only newly started sessions, stale tokens, and selective stop.
- [ ] **Step 2: Run focused tests and confirm failures**.
- [ ] **Step 3: Implement declarative profiles and preview/confirm routes** with same-origin checks and memory-only tokens.
- [ ] **Step 4: Implement Apps startup panel** showing members, conflicts, confirmation, progress, and rollback result.
- [ ] **Step 5: Run startup and full app tests**.
- [ ] **Step 6: Commit** `feat(matriz-control): orchestrate safe ecosystem startup`.

### Task 7: Documentation and full verification

**Files:**
- Modify: `apps/matriz-control/README.md`
- Modify: `apps/matriz-control/AGENTS.md`
- Modify: `docs/DECISION-LOG.md`
- Modify: `apps/matriz-control/design-qa.md`

**Interfaces:**
- Produces: operational ownership, cleanup exclusions, validation commands, and browser QA evidence.
- Consumes: all completed tasks.

- [ ] **Step 1: Document routes, safe actions, resource thresholds, exclusions, prompt/navigation installation, and startup rollback.**
- [ ] **Step 2: Run** app tests, lint, typecheck, build, `corepack pnpm test:smoke`, and boundary checks.
- [ ] **Step 3: Start Matriz Control and verify** Doctor, cleanup preview/cancel, terminal metadata, Workspace filters, startup preview/cancel, keyboard access, and narrow layout in a real browser.
- [ ] **Step 4: Record QA evidence and inspect `git diff --check` plus status for forbidden artifacts.**
- [ ] **Step 5: Commit** `docs(matriz-control): document operations suite`.
