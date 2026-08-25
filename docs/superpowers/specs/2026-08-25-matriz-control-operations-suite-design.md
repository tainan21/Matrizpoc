# Matriz Control Operations Suite — Design

## Objective

Deliver six sequential operational capabilities inside `apps/matriz-control`: Matriz Doctor with disk and RAM control, a minimal Git-aware PowerShell prompt, validated short navigation, a resource-aware terminal, an operational Workspace, and safe ecosystem startup profiles.

## Scope and boundaries

- All product implementation remains app-local to Matriz Control.
- No package is created and no product domain moves into `packages/*`.
- The browser sends only validated project, action, cleanup-target, and startup-profile identifiers. It never sends paths, commands, environment maps, or process IDs to execute.
- UI consumes presenter-produced view models rather than filesystem or process records.
- Physical workspace paths remain server-only. Terminal presentation uses lowercase `mih` routes.
- Terminal output and diagnostic snapshots remain memory-only.
- No `.env` value, token, cookie, command line, or other secret is returned to the browser.

## Delivery sequence

### 1. Matriz Doctor and resource control

Doctor collects a bounded snapshot on demand. It reports runtime/tool availability, declared scripts, occupied ports, Git state, forbidden tracked artifacts, drive capacity, workspace size, and per-project disk use. Disk categories include project source totals plus explicitly named regenerable directories such as `.next`, `.turbo`, and declared cache folders.

RAM attribution uses the process trees already owned by terminal sessions. Each project reports the aggregate working set for its managed root process and descendants. Unmanaged processes using a declared app port may be reported as an external conflict but are never stopped by Control.

Status thresholds are deterministic defaults:

- drive warning below 15% free and critical below 8%;
- project cache warning at 1 GB and critical at 3 GB;
- managed project RAM warning at 1.5 GB and critical at 3 GB;
- unavailable or permission-denied metrics render `unknown`, never zero.

Cleanup is limited to exact, server-resolved, regenerable directories inside a validated project: `.next`, `.turbo`, and declared cache targets. The UI first requests a preview containing exact category and reclaimable bytes, then sends the preview token for confirmation. Cleanup is rejected when the target project has an active session, the token is stale, the resolved path escapes the project, or the target is not allowlisted. `node_modules`, source, Git data, databases, `.env*`, uploads, and user files are never cleanup targets.

### 2. Minimal Git-aware prompt

Both user PowerShell profiles keep `ps mih>` and add a cached branch suffix inside Git worktrees: `ps mih [main]>` or `ps mih [main*]>` when tracked or untracked changes exist. The prompt has a strict short timeout/fallback and omits Git state when unavailable, ensuring typing never blocks on a slow repository.

### 3. Validated short navigation

The PowerShell `mih` function supports `mih` for the workspace root and `mih <project-id>` for a directory returned by the Matriz Control project catalog. Known friendly aliases (`control`, `hub`) map to canonical project IDs. Matching is lowercase and exact. Unknown names print a concise error and make no location change. This is local navigation only and does not extend browser terminal input privileges.

### 4. Resource-aware terminal

Terminal session snapshots add declared port, lowercase route, elapsed time, latest validation result, aggregate RAM, and resource status. The supervisor owns these facts; the UI only renders a terminal view model. Metrics refresh at a slower cadence than terminal output and degrade independently when OS inspection is unavailable.

### 5. Operational Workspace

The existing `/workspace` placeholder becomes a consolidated project table and detail panel. It shows validated route, Git branch/dirty state, disk/cache size, RAM, port/session state, and latest validation. Filters cover attention, running, dirty, and high resource use. Every action links to an existing safe Control operation; Workspace never invents a second process supervisor.

### 6. Safe ecosystem startup

Startup profiles are app-local declarations made only of known project IDs and the existing `dev` action. The initial profiles are `core` (Hub + Control) and `products` (Hub + Control + installed product apps that expose `dev`). Before start, Control validates every project/action, detects duplicate or occupied ports, and returns a preview. Confirmation starts projects sequentially through the existing supervisor. If a newly started member fails, Control stops only the members started by that run; sessions that were already active remain untouched. Stop-profile similarly affects only sessions associated with the selected profile and requires confirmation.

## Components

- `src/domain/doctor.ts`: resource, check, cleanup, and status contracts.
- `src/integration/system/*`: bounded filesystem, Git, port, drive, and process inspection adapters.
- `src/application/doctor-service.ts`: snapshot orchestration, thresholds, caching, and cleanup preview tokens.
- `src/ui/doctor/*`: Doctor presenter and page.
- `src/domain/workspace.ts`, `src/application/workspace-service.ts`, `src/ui/workspace/*`: consolidated read model.
- `src/domain/startup-profile.ts`, `src/application/startup-service.ts`, `src/ui/startup/*`: declarative previews and orchestration.
- Existing terminal domain/supervisor/UI gain resource fields; there is no second runtime.
- PowerShell profile functions remain personal environment configuration and call a generated, read-only navigation catalog emitted by Matriz Control tooling.

## Data flow

Server adapters collect bounded facts → application services normalize them → presenters produce display-safe view models → route handlers return JSON → client pages render and request explicit safe actions. Mutating actions always use server-issued preview tokens and revalidate targets immediately before execution.

## Error handling

Every check reports `healthy`, `warning`, `critical`, or `unknown` with a short remediation. Partial OS failures do not fail the full snapshot. Destructive cleanup and process actions fail closed on stale state, path ambiguity, active sessions, permission errors, or containment violations. UI retains the previous successful snapshot and marks stale sections visibly.

## Validation

- Unit tests cover byte formatting, thresholds, path containment, process-tree aggregation, cleanup allowlists/tokens, prompt rendering, navigation resolution, view models, port conflicts, startup rollback, and stale/unknown states.
- App validation: test, lint, typecheck, and production build for `@matriz/app-matriz-control`.
- Root smoke and boundary tests run because terminal contracts, manifests, process orchestration, and operational rules are affected.
- Browser verification covers Doctor, Workspace, terminal metadata, cleanup confirmation, and startup preview at desktop and narrow widths.

## Explicit exclusions

- No arbitrary shell, path browser, task manager, process killer, scheduled cleanup, background telemetry, historical metrics database, remote control, or multiuser operation.
- No deletion of dependencies, source, secrets, databases, uploads, or user-authored files.
- No shared package extraction until a second real consumer exists.
