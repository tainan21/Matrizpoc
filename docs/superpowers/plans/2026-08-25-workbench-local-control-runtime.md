# Workbench Local Control Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Workbench inside the Matriz Control installer with automatic local access, Hub-or-demo standalone identity, authenticated failure ingestion, and bounded Codex repair orchestration.

**Architecture:** Control owns the Electron lifecycle and starts a separately built Workbench standalone server. The apps remain isolated and communicate over authenticated loopback HTTP; Workbench owns durable diagnostics and Codex repair state while Control owns live processes and native windows.

**Tech Stack:** TypeScript 5.6, Next.js 16 App Router, React 19, Electron 44, Zod 3, Vitest 2, file-backed `.matriz/**` storage.

**Spec:** `docs/superpowers/specs/2026-08-25-workbench-local-control-runtime-design.md`

## Global Constraints

- Bind local servers to `127.0.0.1` only.
- Never import `apps/<other-app>/src/**` or `apps/<other-app>/app/**`.
- Do not create a shared package; keep each side of the loopback contract app-local.
- Do not expose arbitrary shell commands, environment maps, absolute paths, generic filesystem access, or source editing through HTTP.
- Use distinct ephemeral secrets for browser sessions and Control-to-Workbench capability authentication.
- Preserve existing `.matriz/**`, MCP, collaboration, and standalone Codex behavior.
- Maximum three automatic repair attempts per diagnostic fingerprint with cooldowns of 30 seconds, 2 minutes, and 10 minutes.
- Never self-approve Codex commands or file changes; initial sandbox remains read-only and network-disabled.
- Preserve user changes already present in Control and Workbench; inspect each target diff before editing.
- Never commit `.env`, `.next`, `.turbo`, `node_modules`, terminal logs, screenshots, or packaged build output.

---

### Task 1: Workbench Runtime Mode and Local Identity

**Files:**
- Create: `apps/matriz-workbench/src/auth/runtime-mode.ts`
- Create: `apps/matriz-workbench/src/auth/runtime-mode.test.ts`
- Create: `apps/matriz-workbench/src/auth/local-identity.ts`
- Create: `apps/matriz-workbench/src/auth/local-identity.test.ts`
- Modify: `apps/matriz-workbench/src/auth/session.ts`
- Modify: `apps/matriz-workbench/src/auth/local-access.ts`
- Modify: `apps/matriz-workbench/proxy.ts`
- Modify: `apps/matriz-workbench/app/actions.ts`

**Interfaces:**
- Produces: `resolveWorkbenchRuntimeMode(environment): "control-desktop" | "standalone-web" | "test"`
- Produces: `resolveLocalIdentity(input): Promise<WorkbenchIdentity>` where source is `control`, `hub`, or `demo`.
- Produces: `provisionSessionForIdentity(identity): Promise<void>` for server-owned cookie provisioning.

- [ ] **Step 1: Write failing runtime and identity tests**

```ts
expect(resolveWorkbenchRuntimeMode({ WORKBENCH_RUNTIME_MODE: "control-desktop" })).toBe("control-desktop")
expect(resolveWorkbenchRuntimeMode({ NODE_ENV: "test" })).toBe("test")
await expect(resolveLocalIdentity({ mode: "standalone-web", readHubSession: async () => null, hubReachable: async () => false })).resolves.toMatchObject({ source: "demo", label: "Demo local" })
await expect(resolveLocalIdentity({ mode: "control-desktop", readHubSession: async () => null, hubReachable: async () => false })).resolves.toMatchObject({ source: "control", label: "Control local" })
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench test -- src/auth/runtime-mode.test.ts src/auth/local-identity.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement strict server-owned mode and identity resolution**

```ts
export type WorkbenchRuntimeMode = "control-desktop" | "standalone-web" | "test"
export function resolveWorkbenchRuntimeMode(environment: NodeJS.ProcessEnv = process.env): WorkbenchRuntimeMode {
  if (environment.NODE_ENV === "test") return "test"
  if (environment.WORKBENCH_RUNTIME_MODE === "control-desktop") return "control-desktop"
  return "standalone-web"
}
```

Define `WorkbenchIdentity` as `{ id: string; label: string; source: "control" | "hub" | "demo"; roles: readonly ["local-operator"] }`. Hub verification must call `http://127.0.0.1:3000/api/auth/mock/session` with a 750 ms timeout and forward only the incoming Hub cookie; unavailable Hub returns demo, while reachable Hub without a session returns an unauthenticated result used by `/unlock`.

- [ ] **Step 4: Adapt the proxy and session actions**

Allow `control-desktop` to require the Electron-provisioned digest, allow standalone Hub verification or demo provisioning through a Server Action, retain the configured long-token emergency path, and keep loopback/origin/CSP checks unchanged. Browser fields must never select `WORKBENCH_RUNTIME_MODE`.

- [ ] **Step 5: Run auth tests**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench test -- src/auth`

Expected: PASS, including existing token, API-session, rate-limit, and endpoint-security tests.

- [ ] **Step 6: Commit the identity slice**

```powershell
git add -- apps/matriz-workbench/src/auth apps/matriz-workbench/proxy.ts apps/matriz-workbench/app/actions.ts
git commit -m "feat(workbench): add local runtime identities"
```

### Task 2: Identity Presentation and Standalone Login Fallback

**Files:**
- Create: `apps/matriz-workbench/src/ui/presenters/identity-presenter.ts`
- Create: `apps/matriz-workbench/src/ui/presenters/identity-presenter.test.ts`
- Modify: `apps/matriz-workbench/app/unlock/page.tsx`
- Modify: `apps/matriz-workbench/app/(workspace)/layout.tsx`
- Modify: `apps/matriz-workbench/src/ui/components/app-shell.tsx`
- Modify: `apps/matriz-workbench/src/ui/components/shell-chrome.module.css`
- Modify: `apps/matriz-workbench/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `WorkbenchIdentity` from Task 1.
- Produces: `toIdentityViewModel(identity): { label: string; detail: string; tone: "local" | "verified" | "demo" }`.

- [ ] **Step 1: Write the failing presenter test**

```ts
expect(toIdentityViewModel({ id: "demo-local", label: "Demo local", source: "demo", roles: ["local-operator"] })).toEqual({ label: "Demo local", detail: "Hub indisponível · dados locais", tone: "demo" })
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench test -- src/ui/presenters/identity-presenter.test.ts`

Expected: FAIL because the presenter does not exist.

- [ ] **Step 3: Implement the presenter and render identity in the shell**

Resolve identity in the server layout, pass only the view model to `AppShell`, and replace the generic top-bar repository label with the active source plus the existing `.matriz` path. The unlock route must offer the Hub login flow when Hub is reachable and a one-click `Continuar como Demo local` action when it is not.

- [ ] **Step 4: Reuse the existing shared auth flow**

Add `@matriz/flows-auth` and `@matriz/platform-auth` as workspace dependencies only if the existing flow can be configured without importing Hub internals. Use the Hub HTTP broker URL; do not copy Hub auth code.

- [ ] **Step 5: Run UI and type checks**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench test -- src/ui/presenters/identity-presenter.test.ts`

Run: `corepack pnpm --filter @matriz/app-matriz-workbench typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the presentation slice**

```powershell
git add -- apps/matriz-workbench pnpm-lock.yaml
git commit -m "feat(workbench): present Hub and demo identities"
```

### Task 3: Workbench Control Capability and Health Contract

**Files:**
- Create: `apps/matriz-workbench/src/integration/control/capability-auth.ts`
- Create: `apps/matriz-workbench/src/integration/control/capability-auth.test.ts`
- Create: `apps/matriz-workbench/src/integration/control/control-contract.ts`
- Create: `apps/matriz-workbench/src/integration/control/control-contract.test.ts`
- Create: `apps/matriz-workbench/app/api/control/health/route.ts`
- Modify: `apps/matriz-workbench/src/auth/endpoint-security-contract.test.ts`

**Interfaces:**
- Produces: `CONTROL_CONTRACT_VERSION = "workbench-control-v1"`.
- Produces: `authorizeControlRequest(request, environment): Response | undefined`.
- Produces: `controlDiagnosticSchema` with a maximum of 80 output lines and 16 KiB serialized evidence.

- [ ] **Step 1: Write failing capability and schema tests**

```ts
expect(authorizeControlRequest(requestWithBearer("wrong"), { WORKBENCH_CONTROL_CAPABILITY: "a".repeat(64) })?.status).toBe(401)
expect(controlDiagnosticSchema.safeParse({ projectId: "spot", actionId: "test", sessionId: "term_1", status: "failed", exitCode: 1, lines: ["failed"], occurredAt: new Date().toISOString(), fingerprint: "a".repeat(64) }).success).toBe(true)
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench test -- src/integration/control`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement constant-time capability authentication and schema limits**

Accept only `127.0.0.1`, require `Authorization: Bearer <ephemeral-token>`, compare equal-length buffers with `timingSafeEqual`, and return generic errors. The health response is exactly `{ status: "ok", appId: "matriz-workbench", contractVersion: "workbench-control-v1", mode }`.

- [ ] **Step 4: Add structural endpoint coverage**

Extend the existing endpoint contract test so every `/api/control/**` mutation imports and calls `authorizeControlRequest` before reading a body.

- [ ] **Step 5: Run integration security tests**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench test -- src/integration/control src/auth/endpoint-security-contract.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the capability slice**

```powershell
git add -- apps/matriz-workbench/src/integration/control apps/matriz-workbench/app/api/control apps/matriz-workbench/src/auth/endpoint-security-contract.test.ts
git commit -m "feat(workbench): authenticate Control integration"
```

### Task 4: Durable Diagnostic Domain and Repository

**Files:**
- Create: `apps/matriz-workbench/src/domain/control-diagnostic.ts`
- Create: `apps/matriz-workbench/src/domain/control-diagnostic.test.ts`
- Create: `apps/matriz-workbench/src/integration/filesystem/control-diagnostic-repository.ts`
- Create: `apps/matriz-workbench/src/integration/filesystem/control-diagnostic-repository.test.ts`

**Interfaces:**
- Produces: `ControlDiagnostic` with states `open | repairing | cooling_down | resolved | blocked`.
- Produces: `ControlDiagnosticRepository.record(input): Promise<{ diagnostic: ControlDiagnostic; created: boolean }>`.
- Produces: `markAttempt`, `markResolved`, and `markBlocked` revision-checked mutations.

- [ ] **Step 1: Write failing domain and repository tests**

```ts
const first = await repository.record(input)
const duplicate = await repository.record({ ...input, occurredAt: later })
expect(first.created).toBe(true)
expect(duplicate.created).toBe(false)
expect(duplicate.diagnostic.occurrences).toBe(2)
expect(duplicate.diagnostic.latestEvidence).toEqual(["failure"])
```

Also assert that a fourth automatic attempt is rejected and cooldowns resolve to 30_000, 120_000, and 600_000 ms.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench test -- src/domain/control-diagnostic.test.ts src/integration/filesystem/control-diagnostic-repository.test.ts`

Expected: FAIL because the domain and repository do not exist.

- [ ] **Step 3: Implement the schema and atomic file repository**

Persist under `apps/<project>/.matriz/diagnostics/<fingerprint>.json` using `open(..., "wx", 0o600)`, temp-file sync, atomic rename, revision hashes, symlink containment, and the existing coordinator lock pattern. Store no more than 80 redacted lines.

- [ ] **Step 4: Record bounded activity**

Append `control.diagnostic.opened`, `control.diagnostic.repeated`, `control.diagnostic.resolved`, or `control.diagnostic.blocked` with project/action/fingerprint metadata only.

- [ ] **Step 5: Run domain and filesystem tests**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench test -- src/domain/control-diagnostic.test.ts src/integration/filesystem/control-diagnostic-repository.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the diagnostic storage slice**

```powershell
git add -- apps/matriz-workbench/src/domain/control-diagnostic* apps/matriz-workbench/src/integration/filesystem/control-diagnostic-repository*
git commit -m "feat(workbench): persist Control diagnostics"
```

### Task 5: Automated Codex Repair Orchestrator

**Files:**
- Create: `apps/matriz-workbench/src/application/control-diagnostic-service.ts`
- Create: `apps/matriz-workbench/src/application/control-diagnostic-service.test.ts`
- Modify: `apps/matriz-workbench/src/application/codex-run-manager.ts`
- Modify: `apps/matriz-workbench/src/application/codex-run-manager.test.ts`
- Modify: `apps/matriz-workbench/src/integration/filesystem/workspace-repository.ts`
- Modify: `apps/matriz-workbench/src/integration/filesystem/workspace-repository.test.ts`

**Interfaces:**
- Consumes: `ControlDiagnosticRepository` from Task 4 and `CodexRunManager.start(...)`.
- Produces: `ControlDiagnosticService.ingest(input): Promise<ControlDiagnostic>`.
- Produces: `ControlDiagnosticService.retry(projectId, diagnosticId): Promise<ControlDiagnostic>`.
- Produces: `CodexRunManager.startAutomatedRepair(projectId, requestId, expectedRevision, diagnosticId)`.

- [ ] **Step 1: Write the failing orchestration tests**

```ts
await service.ingest(failingDiagnostic)
expect(agentRequests.create).toHaveBeenCalledTimes(1)
expect(codex.startAutomatedRepair).toHaveBeenCalledTimes(1)
await service.ingest(failingDiagnostic)
expect(agentRequests.create).toHaveBeenCalledTimes(1)
expect(codex.startAutomatedRepair).toHaveBeenCalledTimes(1)
```

Test intentional stops, unsupported actions, insufficient evidence, concurrent duplicates, cooldown, unavailable Codex, successful declared-action rerun, and the three-attempt blocked transition.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench test -- src/application/control-diagnostic-service.test.ts`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Add a bounded Agent Request factory**

Create a request titled `Corrigir falha de <actionId> em <projectId>`, claim it as `codex`, set execution mode `change`, restrict scope to the affected app, and declare only the original validated command as the planned check. Link the diagnostic ID in request context without changing backlog state, roadmap, validation, or score.

- [ ] **Step 4: Add the automated start entry point**

Reuse the existing App Server startup, read-only sandbox, network-disabled policy, approvals, concurrency cap, evidence persistence, and completion flow. Add diagnostic context to the compact prompt and never route approval responses automatically.

- [ ] **Step 5: Implement rerun requests and loop protection**

After a successful Codex turn, persist a `rerun_requested` lease for only the original declared action so Control can claim it through Task 6. Accept a result only when diagnostic ID, action, attempt, and lease match. Mark resolved only on exit code zero. Persist cooldown and attempt count before scheduling another turn; mark blocked after attempt three.

- [ ] **Step 6: Run manager and orchestration tests**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench test -- src/application/control-diagnostic-service.test.ts src/application/codex-run-manager.test.ts src/integration/filesystem/workspace-repository.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the repair slice**

```powershell
git add -- apps/matriz-workbench/src/application apps/matriz-workbench/src/integration/filesystem/workspace-repository*
git commit -m "feat(workbench): orchestrate bounded Codex repairs"
```

### Task 6: Diagnostic HTTP Routes

**Files:**
- Create: `apps/matriz-workbench/app/api/control/diagnostics/route.ts`
- Create: `apps/matriz-workbench/app/api/control/diagnostics/[diagnosticId]/repair/route.ts`
- Create: `apps/matriz-workbench/app/api/control/repairs/next/route.ts`
- Create: `apps/matriz-workbench/app/api/control/repairs/[diagnosticId]/result/route.ts`
- Create: `apps/matriz-workbench/app/api/control/diagnostics/route.test.ts`
- Create: `apps/matriz-workbench/app/api/control/diagnostics/[diagnosticId]/repair/route.test.ts`
- Create: `apps/matriz-workbench/app/api/control/repairs/next/route.test.ts`
- Create: `apps/matriz-workbench/app/api/control/repairs/[diagnosticId]/result/route.test.ts`

**Interfaces:**
- Consumes: capability auth from Task 3 and diagnostic service from Task 5.
- Produces: `POST /api/control/diagnostics` returning `202` with `{ diagnosticId, state, occurrences }`.
- Produces: `POST /api/control/diagnostics/:diagnosticId/repair` returning `202` with `{ diagnosticId, state, attempt }`.
- Produces: `GET /api/control/repairs/next` returning `204` or `{ diagnosticId, projectId, actionId, attempt, lease }`.
- Produces: `POST /api/control/repairs/:diagnosticId/result` accepting the matching lease, action, attempt, exit code, and bounded evidence.

- [ ] **Step 1: Write failing route tests**

Test missing/wrong capability, non-loopback host, oversized body, invalid action ID, duplicate ingestion, blocked retry, single-consumer rerun lease, mismatched result rejection, and generic `500` serialization without internal paths.

- [ ] **Step 2: Run route tests and verify failure**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench test -- app/api/control`

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Implement thin authenticated route handlers**

Authorize before parsing JSON, cap content length at 24 KiB, validate with `controlDiagnosticSchema`, delegate to `ControlDiagnosticService`, set `Cache-Control: no-store`, and map domain conflicts to `409` and rate limits to `429`.

- [ ] **Step 4: Run route and security tests**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench test -- app/api/control src/auth/endpoint-security-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the route slice**

```powershell
git add -- apps/matriz-workbench/app/api/control
git commit -m "feat(workbench): accept authenticated diagnostics"
```

### Task 7: Control-Managed Workbench Runtime

**Files:**
- Create: `apps/matriz-control/src/domain/workbench-runtime.ts`
- Create: `apps/matriz-control/src/domain/workbench-runtime.test.ts`
- Create: `apps/matriz-control/src/application/workbench-runtime-supervisor.ts`
- Create: `apps/matriz-control/src/application/workbench-runtime-supervisor.test.ts`
- Create: `apps/matriz-control/src/integration/workbench/workbench-client.ts`
- Create: `apps/matriz-control/src/integration/workbench/workbench-client.test.ts`

**Interfaces:**
- Produces: `WorkbenchRuntimeSnapshot` with states `stopped | starting | ready | failed | incompatible`.
- Produces: `WorkbenchRuntimeSupervisor.start(): Promise<WorkbenchRuntimeSnapshot>`, `stop()`, `restart()`, and `snapshot()`.
- Produces: `WorkbenchClient.health()`, `sendDiagnostic(input)`, `nextRepair()`, and `reportRepairResult(input)`.

- [ ] **Step 1: Write failing supervisor and client tests**

```ts
const first = await supervisor.start()
const second = await supervisor.start()
expect(runtime.start).toHaveBeenCalledTimes(1)
expect(second.pid).toBe(first.pid)
await expect(client.health()).resolves.toMatchObject({ contractVersion: "workbench-control-v1" })
```

Test safe environment construction, readiness timeout, occupied incompatible port, restart backoff, secret redaction, bounded delivery retries, and stop-on-Control-exit.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `corepack pnpm --filter @matriz/app-matriz-control test -- src/domain/workbench-runtime.test.ts src/application/workbench-runtime-supervisor.test.ts src/integration/workbench/workbench-client.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement process and path resolution**

Development resolves `MATRIZ_WORKBENCH_DESKTOP_URL` or the workspace app. Packaged mode resolves only `process.resourcesPath/workbench/server.js`. Spawn with `ELECTRON_RUN_AS_NODE=1`, `HOSTNAME=127.0.0.1`, `PORT=3005`, `WORKBENCH_RUNTIME_MODE=control-desktop`, workspace root, browser-session token, and a distinct 32-byte capability token. Do not inherit Control or provider secrets unnecessarily.

- [ ] **Step 4: Implement health compatibility and client retries**

Poll for at most 10 seconds in 100 ms increments, require `workbench-control-v1`, and classify an occupied incompatible port without killing its process. Retry diagnostic delivery at 250 ms, 1 second, and 4 seconds while retaining at most 20 in-memory items.

- [ ] **Step 5: Run runtime tests**

Run: `corepack pnpm --filter @matriz/app-matriz-control test -- src/domain/workbench-runtime.test.ts src/application/workbench-runtime-supervisor.test.ts src/integration/workbench/workbench-client.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the runtime slice**

```powershell
git add -- apps/matriz-control/src/domain/workbench-runtime* apps/matriz-control/src/application/workbench-runtime-supervisor* apps/matriz-control/src/integration/workbench
git commit -m "feat(control): supervise installed Workbench"
```

### Task 8: Electron Launch and Installed-App UI

**Files:**
- Modify: `apps/matriz-control/src/domain/desktop-bridge.ts`
- Modify: `apps/matriz-control/src/domain/desktop-command.test.ts`
- Modify: `apps/matriz-control/desktop/preload.ts`
- Modify: `apps/matriz-control/desktop/main.ts`
- Modify: `apps/matriz-control/tsconfig.desktop.json`
- Modify: `apps/matriz-control/src/ui/apps-console.tsx`
- Create: `apps/matriz-control/src/ui/workbench-runtime-card.tsx`
- Create: `apps/matriz-control/src/ui/workbench-runtime-card.test.tsx`

**Interfaces:**
- Adds desktop commands `workbench.status`, `workbench.open`, and `workbench.restart` without browser-supplied URLs or paths.
- Adds browser event `{ type: "workbench.updated"; snapshot: WorkbenchRuntimeSnapshot }`.

- [ ] **Step 1: Write failing desktop-command and UI tests**

```ts
expect(parseDesktopCommand({ type: "workbench.open", url: "https://evil.example" })).toEqual({ type: "workbench.open" })
expect(screen.getByRole("button", { name: "Abrir Workbench" })).toBeEnabled()
```

Assert that stopped, starting, ready, failed, and incompatible states have textual labels independent of color.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `corepack pnpm --filter @matriz/app-matriz-control test -- src/domain/desktop-command.test.ts src/ui/workbench-runtime-card.test.tsx`

Expected: FAIL because commands and card are absent.

- [ ] **Step 3: Wire the supervisor into Electron**

Start Workbench lazily on `workbench.open`, create one dedicated `BrowserWindow`, set `matriz_workbench_session` through Electron cookies for `http://127.0.0.1:3005`, load the fixed URL, focus an existing window, and stop the child during `before-quit`. Validate IPC sender and origin with the existing `assertTrusted` boundary.

- [ ] **Step 4: Render Workbench as a built-in installed app**

Place the card in Apps or Store with status, open diagnostics count, latest repair state, open/restart actions, and bounded failure copy. Do not render absolute paths or secrets.

- [ ] **Step 5: Run desktop and UI checks**

Run: `corepack pnpm --filter @matriz/app-matriz-control test -- src/domain/desktop-command.test.ts src/ui/workbench-runtime-card.test.tsx`

Run: `corepack pnpm --filter @matriz/app-matriz-control typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the desktop UI slice**

```powershell
git add -- apps/matriz-control/desktop apps/matriz-control/src/domain/desktop-bridge.ts apps/matriz-control/src/domain/desktop-command.test.ts apps/matriz-control/src/ui apps/matriz-control/tsconfig.desktop.json
git commit -m "feat(control): open Workbench as a built-in app"
```

### Task 9: Terminal Failure Delivery

**Files:**
- Modify: `apps/matriz-control/src/application/terminal-supervisor.ts`
- Modify: `apps/matriz-control/src/application/terminal-supervisor.test.ts`
- Create: `apps/matriz-control/src/application/control-diagnostic-mapper.ts`
- Create: `apps/matriz-control/src/application/control-diagnostic-mapper.test.ts`
- Modify: `apps/matriz-control/desktop/main.ts`

**Interfaces:**
- Produces: `toControlDiagnostic(session): ControlDiagnosticInput | undefined`.
- Adds optional `onEligibleFailure(diagnostic): Promise<void>` to `TerminalSupervisor` composition.
- Adds a one-second desktop repair loop that claims one pending rerun and invokes only `TerminalSupervisor.start(projectId, actionId)` through the validated catalog.

- [ ] **Step 1: Write failing mapping and supervisor tests**

```ts
expect(toControlDiagnostic(failedSession)).toMatchObject({ projectId: "demo", actionId: "test", exitCode: 1 })
expect(toControlDiagnostic({ ...failedSession, status: "exited", exitCode: 0 })).toBeUndefined()
expect(deliver).toHaveBeenCalledTimes(1)
```

Test ANSI stripping, token/password/API-key redaction, `mih/...` route normalization, 80-line truncation, stable SHA-256 fingerprinting, intentional stop exclusion, and delivery failure isolation.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `corepack pnpm --filter @matriz/app-matriz-control test -- src/application/control-diagnostic-mapper.test.ts src/application/terminal-supervisor.test.ts`

Expected: FAIL because the mapper and callback are absent.

- [ ] **Step 3: Implement failure mapping and delivery**

Map only declared `dev`, `lint`, `typecheck`, or `test` actions with non-zero exits or supervisor failures. Invoke delivery after the final partial line is flushed; never block terminal state updates on network failure.

- [ ] **Step 4: Wire the Workbench client at desktop composition**

Pass `diagnostic => workbenchClient.sendDiagnostic(diagnostic)` into the singleton supervisor used by Electron. While Workbench is healthy, poll `nextRepair()` at most once per second, start only its declared project/action through the existing resolver, await the terminal exit, and call `reportRepairResult` with the matching lease. Keep the web-only Control terminal functional when no Workbench client exists.

- [ ] **Step 5: Run terminal regression tests**

Run: `corepack pnpm --filter @matriz/app-matriz-control test -- src/application/control-diagnostic-mapper.test.ts src/application/terminal-supervisor.test.ts`

Expected: PASS, including current terminal route and environment tests.

- [ ] **Step 6: Commit the failure-delivery slice**

```powershell
git add -- apps/matriz-control/src/application apps/matriz-control/desktop/main.ts
git commit -m "feat(control): deliver process failures to Workbench"
```

### Task 10: Packaging, Manifests, and Operational Documentation

**Files:**
- Modify: `apps/matriz-workbench/next.config.mjs`
- Modify: `apps/matriz-workbench/package.json`
- Modify: `apps/matriz-workbench/src/manifest/manifest.ts`
- Modify: `apps/matriz-workbench/README.md`
- Modify: `apps/matriz-workbench/docs/CODEX-APP-SERVER.md`
- Create: `apps/matriz-workbench/docs/CONTROL-INTEGRATION.md`
- Modify: `apps/matriz-control/package.json`
- Modify: `apps/matriz-control/src/manifest/manifest.ts`
- Modify: `apps/matriz-control/README.md`
- Modify: `docs/DECISION-LOG.md`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Workbench Next build emits standalone output.
- Control `desktop:build` builds Workbench first and packages its standalone server/static assets under `resources/workbench`.
- Manifests describe installed Workbench and bounded repair coordination without claiming generic source or shell authority.

- [ ] **Step 1: Write or extend manifest and packaging contract tests**

Assert the Workbench manifest includes `workbench.diagnostics.repair`, Control includes `control.workbench.host`, the Electron build has a Workbench `extraResources` entry, and `desktop:build` invokes the Workbench build before packaging.

- [ ] **Step 2: Run tests and verify failure**

Run: `corepack pnpm exec vitest run tests/smoke/manifests.test.ts tests/smoke/matriz-desktop-workflow.test.ts --config vitest.config.ts`

Expected: FAIL until manifests and packaging metadata are updated.

- [ ] **Step 3: Update standalone and Electron packaging**

Set Workbench `output: "standalone"`. Copy `.next/standalone`, `.next/static`, and required public assets into the fixed Workbench resource layout. Do not package `.matriz/**`, `.env`, logs, screenshots, source maps containing secrets, or development caches.

- [ ] **Step 4: Document runtime, auth fallback, diagnostics, recovery, and the automatic-start exception**

Document environment names without values, health/version behavior, port conflict recovery, Demo local semantics, three-attempt ceiling, approval behavior, and standalone degradation. Add the architectural decision to the Decision Log with review conditions for remote operation, multiuser identity, or a third integration consumer.

- [ ] **Step 5: Run scoped builds and smoke tests**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench build`

Run: `corepack pnpm --filter @matriz/app-matriz-control build`

Run: `corepack pnpm test:smoke`

Expected: PASS.

- [ ] **Step 6: Commit packaging and documentation**

```powershell
git add -- apps/matriz-workbench apps/matriz-control/package.json apps/matriz-control/src/manifest/manifest.ts apps/matriz-control/README.md docs/DECISION-LOG.md pnpm-lock.yaml tests/smoke
git commit -m "feat: package Workbench with Matriz Control"
```

### Task 11: Installed Runtime and Failure-Flow Verification

**Files:**
- Create: `apps/matriz-control/src/application/workbench-installed-runtime.test.ts`
- Create: `apps/matriz-workbench/src/application/control-repair-flow.test.ts`
- Modify: `apps/matriz-workbench/docs/RECOVERY.md`

**Interfaces:**
- Verifies the complete Control → Workbench → Codex-request → declared-rerun flow through public boundaries.

- [ ] **Step 1: Write the installed-runtime smoke test**

Use temporary roots and fake process/Electron adapters to prove one managed child, automatic session cookie provisioning, fixed loopback URL, compatible health response, single-window focus, and child shutdown.

- [ ] **Step 2: Write the failure-flow test**

Inject a declared failing `test` action, deliver the same sanitized diagnostic twice, assert one diagnostic and one Agent Request, simulate three unsuccessful repair turns with the exact cooldown sequence, assert `blocked`, then simulate explicit retry plus exit code zero and assert `resolved` with preserved history.

- [ ] **Step 3: Run complete scoped test suites**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench test`

Run: `corepack pnpm --filter @matriz/app-matriz-control test`

Expected: PASS.

- [ ] **Step 4: Run static and production checks**

Run: `corepack pnpm --filter @matriz/app-matriz-workbench lint`

Run: `corepack pnpm --filter @matriz/app-matriz-workbench typecheck`

Run: `corepack pnpm --filter @matriz/app-matriz-workbench build`

Run: `corepack pnpm --filter @matriz/app-matriz-control lint`

Run: `corepack pnpm --filter @matriz/app-matriz-control typecheck`

Run: `corepack pnpm --filter @matriz/app-matriz-control build`

Run: `corepack pnpm test:smoke`

Expected: all commands exit 0.

- [ ] **Step 5: Inspect repository hygiene and boundaries**

Run: `git status --short`

Run: `git diff --check`

Run: `rg -n "apps/(matriz-workbench|matriz-control)/(src|app)" apps/matriz-workbench apps/matriz-control --glob "*.ts" --glob "*.tsx"`

Expected: no generated artifacts or secrets, no whitespace errors, and no cross-app internal imports.

- [ ] **Step 6: Record Workbench artifacts without changing score automatically**

Use the Workbench's named workflows to create one backlog item titled `Instalar Workbench no Matriz Control` for the five delivery slices and append one verification activity containing the exact changed-file list and successful commands. Update both roadmaps only for the approved local-runtime direction. Leave score unchanged unless an existing explicit goal is fully evidenced.

- [ ] **Step 7: Commit final verification evidence**

```powershell
git add -- apps/matriz-control/src/application/workbench-installed-runtime.test.ts apps/matriz-workbench/src/application/control-repair-flow.test.ts apps/matriz-workbench/docs/RECOVERY.md
git commit -m "test: verify installed Workbench repair flow"
```

Commit `.matriz/**` artifacts separately only after reviewing the exact files produced by the named Workbench workflows; never stage a whole `.matriz` directory.
