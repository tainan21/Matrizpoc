# Matriz Control Universal Project Host — Cycle 1 Design

## Goal

Deliver a complete Node/web vertical slice that lets the Matriz Control desktop register an existing external project without copying it, inspect it without side effects, review and approve a versioned recipe, optionally prepare dependencies after explicit confirmation, run the approved action through the existing process supervisor, wait for honest readiness, host an exact loopback surface when compatible, fall back to the external browser when embedding is blocked, and safely stop, restart, reconcile, or remove the registration.

Cycle 1 is app-local to `apps/matriz-control`. It does not create a shared package, import another app's internals, absorb the hosted project's domain, or implement the later universal stack detectors.

## Architectural decision

The Electron main process is the only authority for native root selection, canonical absolute paths, persistence under `app.getPath("userData")`, process composition, and embedded `WebContentsView` surfaces. The renderer receives opaque IDs and sanitized ViewModels only.

`src/modules/projects` owns registration, inspection evidence, recipes, review state, permissions, readiness, sessions, and Project Host presentation. It resolves approved actions through ports and delegates lifecycle to the existing `TerminalSupervisor`; it does not create a second process authority. Existing monorepo catalog behavior remains intact and is adapted behind the same supervisor boundary.

Sibling modules consume only `src/modules/projects/public.ts`. Composition happens in the app bootstrap for web-safe services and in Electron main for native adapters.

## Module structure

```text
apps/matriz-control/src/modules/projects/
  domain/
    project.ts
    recipe.ts
    state-machine.ts
    root-policy.ts
    permissions.ts
    redaction.ts
  application/
    project-host-service.ts
    project-session-service.ts
  integration/
    node-project-detector.ts
    atomic-project-store.ts
    project-readiness.ts
  presentation/
    project-presenter.ts
  ports.ts
  facade.ts
  public.ts
```

Electron-only adapters remain under `desktop/` and implement the module ports for folder selection, canonical root storage, native persistence, process ownership, external opening, and embedded surfaces.

## Domain contracts

The module defines equivalents of `ProjectRegistration`, `ProjectRecipe`, `ProjectAction`, and `ProjectSurface` from the mission. Registrations exposed outside the native adapter contain `canonicalRootRef`, never an absolute path. Recipe actions contain executable and argument arrays as reviewed data, but renderer commands never contain those fields.

Project states are:

```text
unknown, inspecting, needs_review, ready, preparing, starting, running,
degraded, stopping, stopped, blocked, failed
```

Transitions fail closed. Inspection yields `needs_review`; approval of the current revision yields `ready`; manifest drift invalidates approval and returns to `needs_review`. Readiness timeout yields `degraded` or `failed`, never `running`. A disappeared persisted session reconciles to `stopped` with a reason.

Permissions are independent capability IDs. Cycle 1 uses `project.inspect`, `project.register`, `project.dependencies.install`, `project.process.start`, `project.process.stop`, `project.surface.embed`, `project.surface.open_external`, and `project.logs.read`. Agent and MCP surfaces remain read-only and cannot approve, prepare, start, stop, or provide execution material.

## Root selection and storage

The desktop folder dialog returns a short-lived opaque candidate ID. The native root adapter resolves it, calls `realpath`, verifies an existing directory, applies case-insensitive Windows deduplication, and rejects filesystem roots, the complete user home, Windows/system directories, Program Files, credential directories, and other broad sensitive roots.

Every inspected file is resolved from the canonical root and checked again after `realpath`; junction or symlink escape is rejected. Inspection is bounded by depth, file count, total bytes, individual file size, and deadline. It reads only detector inputs and never scans a drive or the full home directory.

The native catalog persists atomically under Electron user data using write-temp, flush/close, and rename semantics. It stores the protected canonical root only in the native record, plus approved recipe revisions, preparation evidence, surface preference, bounded session history, and reconciliation state. Removing a registration deletes only catalog data and never touches the project directory.

## Node discovery and recipe review

The Node detector reads `package.json`, supported lockfiles, `engines`, scripts, and workspace metadata as untrusted data. It supports pnpm, npm, and bun evidence independently. Multiple conflicting lockfiles produce a blocked review choice; no manager is silently selected.

Detection produces candidates, not executable authority. The review ViewModel shows executable, arguments, masked working directory, environment variable names, requested ports, expected disk changes, preparation command, readiness, lifecycle-script warning, and hosting policy.

The recipe revision is a deterministic SHA-256 over normalized relevant evidence and materialized recipe fields. A fresh inspection before prepare or start recomputes the revision. Mismatch rejects stale confirmation and moves the project to `needs_review`.

Cycle 1 preparation candidates are exactly:

- `corepack pnpm install --frozen-lockfile`;
- `npm ci`;
- `bun install --frozen-lockfile`.

Inspection and registration never execute them. Preparation requires the current recipe revision and a native, single-use, short-lived confirmation token issued after preview. The preview explicitly warns that package-manager lifecycle scripts may execute. No global tools, PATH changes, Docker, or system changes are performed.

## Typed desktop intents

Renderer-to-main messages accept only bounded payloads:

```ts
type ProjectIntent =
  | { type: "project.pick-root" }
  | { type: "project.inspect"; projectId: string }
  | { type: "project.approve"; projectId: string; recipeRevision: string }
  | { type: "project.prepare.preview"; projectId: string; recipeRevision: string }
  | { type: "project.prepare"; projectId: string; recipeRevision: string; confirmationToken: string }
  | { type: "project.start"; projectId: string; actionId: string; recipeRevision: string }
  | { type: "project.stop"; projectId: string; sessionId: string }
  | { type: "project.restart"; projectId: string; sessionId: string }
  | { type: "project.open"; projectId: string; surfaceId: string }
  | { type: "project.remove"; projectId: string }
  | { type: "project.list" }
```

The parser rejects extra keys. Root, executable, arguments, cwd, environment values, ports, readiness URLs, and surface origins are always resolved native-side from the approved revision.

## Process ownership and readiness

`TerminalSupervisor` evolves through a resolver port that can resolve either an existing trusted monorepo action or an approved Project Host action. The start API remains idempotent for the same active project/action. Project sessions add project/action/revision correlation, expected ports, PID, start time, readiness state, and ownership evidence.

Before spawn, the service checks expected port availability but never treats a port as process identity. A foreign listener creates a blocked conflict and cannot be stopped. Only handles created by the supervisor can be stopped or restarted.

Spawn uses executable and argument arrays with `shell: false`. The current Windows `cmd /c` string composition for Corepack is replaced by a non-interpolating executable resolution suitable for `.cmd` launch, because approved arguments must never be joined into a command string. Output is bounded and redacted for secret-looking assignments, bearer/authorization headers, credential-bearing URLs, and configured secret names.

Stop first requests graceful termination and reports the grace period. Windows process-tree escalation is restricted to the owned PID/tree; force escalation is visible and requires confirmation when ownership evidence is insufficient. Restart re-resolves the same approved revision and creates a new session while retaining bounded sanitized history.

HTTP readiness accepts only `http://127.0.0.1:<approved-port>` or `http://localhost:<approved-port>` plus the reviewed health path. It has a bounded interval and timeout. Early exit and timeout are explicit outcomes. A newly observed port is informational only until a new recipe revision is reviewed.

## Embedded and external surfaces

Electron main resolves the exact loopback origin from the approved surface and waits for readiness before creating a `WebContentsView`. The view uses sandboxing, context isolation, no Node integration, no preload with privileged IPC, and a dedicated partition without Control cookies.

Navigation is restricted to the exact approved loopback origin. New windows, non-approved navigation, downloads, filesystem access, clipboard, camera, microphone, and permission requests are denied. `file:`, `javascript:`, unsafe `data:`, and every non-loopback origin are blocked.

Before embedding, the host probes response headers. Incompatible `X-Frame-Options`, CSP `frame-ancestors`, navigation behavior, or load failure produces an honest external-browser fallback; protections are never bypassed. External opening also uses only the native-resolved approved URL.

## UI

The existing shell gains one coherent Project Host flow rather than a second shell:

- **Add project:** folder selection, bounded evidence, recipe review, registration, optional preparation, start/open.
- **Apps / Library:** dense operational list with stack, trust, state, primary action, and attention reason.
- **Workspace:** selected-project summary, sessions, surfaces, ports/readiness, sanitized logs, recipe/permissions, diagnostics, and catalog-only removal.
- **Home:** recent, running, blocked, and needs-review summaries with ID-only actions.
- **Terminal:** Project Host sessions appear through the existing supervisor and presenter.

All components consume `ProjectViewModel` and session ViewModels. Empty, loading, preparing, missing dependency, port conflict, stale recipe, readiness timeout, early exit, incompatible surface, and removed-project states are explicit.

## Error handling and reconciliation

Domain errors have stable codes and sanitized human messages. Native errors never return absolute paths, command lines, environment values, or raw process output. Persistence corruption preserves the last valid file where possible and produces `blocked`; it never silently starts with a fabricated empty catalog.

On desktop start, persisted sessions are compared with strong ownership evidence. Cycle 1 does not adopt arbitrary existing processes. A session lacking evidence becomes stopped/reconciled; a foreign process on the expected port remains observational.

## Testing strategy

TDD is applied behavior by behavior.

Unit tests cover root normalization/deduplication and prohibited roots, bounded inspection, Node evidence and conflicting managers, deterministic revisions, transitions, permissions, redaction, presenters, stale confirmation, and manifest invalidation.

Temporary integration tests create two Node fixtures outside the monorepo and cover read-only pnpm/npm/bun detection, no install during inspection, approved start/readiness/stop/restart, early death, timeout, port conflict, child tree shutdown, reconciliation, junction escape, manifest drift, and synthetic-secret redaction.

Electron tests prove picker opacity, strict intent parsing, native-only execution resolution, permission/navigation denial, foreign-process protection, atomic persistence across restart, catalog removal without file deletion, compatible embedded surface, and incompatible fallback. The final acceptance run exercises the full twelve-step desktop flow from the mission.

## Delivery sequence

1. Domain invariants, root policy, detector, recipe revision, and presenters.
2. Native root picker and atomic catalog persistence.
3. Approval and confirmed preparation.
4. Supervisor integration, ownership, ports, readiness, stop/restart, and reconciliation.
5. Embedded/external surfaces with exact-origin policy.
6. Add-project, Library/Apps, Workspace, Home, and Terminal integration.
7. External fixtures, Electron E2E, documentation, threat model, troubleshooting, and acceptance gates.

Each slice must be independently testable and preserve the existing monorepo catalog, Store, Workbench, Health, updater, browser, Doctor, and terminal behavior.

## Explicitly deferred

Python, Rust, .NET, Go, Java/Kotlin, PHP, explicit binaries, static-web custom commands, Docker, secret references, imported/exported recipes, multiple dependent services, execution profiles, signed shared recipes, and agent mutation belong to later cycles. Cycle 2 does not start until every Cycle 1 acceptance criterion is demonstrated in the real desktop runtime.

