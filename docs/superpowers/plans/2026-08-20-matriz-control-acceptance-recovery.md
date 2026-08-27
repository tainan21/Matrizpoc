# Matriz Control Acceptance and Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a repeatable Windows acceptance laboratory, audit the installed Matriz Control, fix every Critical and Important finding, and certify a clean packaged candidate with reports and screenshots.

**Architecture:** Keep privileged acceptance behavior outside the renderer. Pure acceptance contracts and UI tests live with the TypeScript app, Windows authority remains in Rust, WebdriverIO drives a test-profile Tauri binary, and one bounded PowerShell harness owns installer/process orchestration. The production package never includes WDIO plugins or permissions.

**Tech Stack:** Tauri 2.11, Rust 2021, React 19, TypeScript 5.6, Vitest 2.1, WebdriverIO 9.31, `@wdio/tauri-service` 1.3, PowerShell 7, NSIS, GitHub Actions Windows runners.

**Spec:** `docs/superpowers/specs/2026-08-20-matriz-control-acceptance-recovery-design.md`

## Global Constraints

- Work primarily inside `apps/matriz-desktop`; shared/root changes are limited to CI, lockfile and audit documentation required by this cycle.
- Never import another app's `src/**` or `app/**`.
- Renderer automation accepts catalog IDs and structured values only; no raw executable, argument, process-name or arbitrary URL command may be added.
- Terminal input reaches only an explicit ConPTY session and is never persisted in evidence.
- Test-owned processes are the only processes acceptance automation may terminate.
- The WDIO Rust/guest plugins are optional acceptance-profile dependencies and are absent from the production NSIS build.
- `apps/seumeiapp` is an external acceptance target only; do not modify its domain code.
- Validate recursive cleanup paths inside the acceptance output/temp roots before deletion.
- Screenshots, installers, logs, Cargo targets and generated DOCX/PDF remain ignored under `output/`.
- This cycle sends no remote telemetry, persists no terminal content and does not implement store, login, updater or download behavior.
- Every functional fix begins with a failing test and ends with focused plus scoped validation.
- At most five correction rounds per root-cause group; report an external blocker after three evidenced attempts.

## File Structure

### Acceptance contracts and reports

- `apps/matriz-desktop/src/acceptance/catalog.ts` — stable acceptance IDs, families, risk and target requirements.
- `apps/matriz-desktop/src/acceptance/catalog.test.ts` — uniqueness and coverage invariants.
- `apps/matriz-desktop/src/acceptance/results.ts` — immutable result/evidence types and summary presenter.
- `apps/matriz-desktop/src/acceptance/results.test.ts` — Ready/Not Ready/Blocked verdict rules.
- `apps/matriz-desktop/acceptance/results.schema.json` — language-neutral result schema for PowerShell/CI.
- `apps/matriz-desktop/acceptance/generate-report.mjs` — JSON-to-Markdown audit generator.
- `apps/matriz-desktop/acceptance/generate-report.test.mjs` — Node test for deterministic/redacted reports.

### Native contract and Windows harness

- `apps/matriz-desktop/src/integration/tauri/command-contract.ts` — canonical renderer command names and argument keys.
- `apps/matriz-desktop/src/integration/tauri/command-contract.test.ts` — complete `DesktopGateway` serialization matrix.
- `apps/matriz-desktop/src-tauri/src/command_contract.rs` — native command-name inventory used by Rust tests.
- `apps/matriz-desktop/src-tauri/tests/command_contract.rs` — native/renderer inventory evidence and sensitive-command denial.
- `apps/matriz-desktop/acceptance/windows/matriz-control-acceptance.ps1` — inspect/build/install/launch/uninstall orchestrator.
- `apps/matriz-desktop/acceptance/windows/probe-listener.ps1` — test-owned TCP listener child.
- `apps/matriz-desktop/acceptance/windows/acceptance-script.test.ts` — safe-path and inspect-mode integration tests.

### Tauri renderer E2E

- `apps/matriz-desktop/wdio.conf.ts` — acceptance-profile Tauri capability and artifact paths.
- `apps/matriz-desktop/acceptance/e2e/navigation.e2e.ts` — modes, keyboard, Command Deck and settings.
- `apps/matriz-desktop/acceptance/e2e/terminal.e2e.ts` — deterministic PowerShell, tabs, resize, interrupt and cleanup.
- `apps/matriz-desktop/acceptance/e2e/apps.e2e.ts` — managed app lifecycle and readiness.
- `apps/matriz-desktop/acceptance/e2e/native-admin.e2e.ts` — Matriz Admin native states.
- `apps/matriz-desktop/acceptance/e2e/visual.e2e.ts` — supported viewports, overflow and screenshots.
- `apps/matriz-desktop/src/e2e/enable-wdio.ts` — acceptance-only guest plugin import.
- `apps/matriz-desktop/src-tauri/capabilities/acceptance.json` — WDIO permissions only for acceptance builds.

### CI and documentation

- `.github/workflows/matriz-desktop.yml` — corrected PR package smoke.
- `.github/workflows/matriz-desktop-acceptance.yml` — scheduled/manual full Windows matrix.
- `apps/matriz-desktop/docs/ACCEPTANCE.md` — local commands, safety and coverage map.
- `docs/audit/2026-08-20-matriz-control-acceptance.md` — generated canonical report.
- `docs/DECISION-LOG.md` — acceptance laboratory decision.
- `apps/matriz-desktop/README.md` — operator commands and artifact locations.

---

### Task 1: Define acceptance IDs, evidence and verdicts

**Files:**
- Create: `apps/matriz-desktop/src/acceptance/catalog.ts`
- Create: `apps/matriz-desktop/src/acceptance/catalog.test.ts`
- Create: `apps/matriz-desktop/src/acceptance/results.ts`
- Create: `apps/matriz-desktop/src/acceptance/results.test.ts`
- Create: `apps/matriz-desktop/acceptance/results.schema.json`

**Interfaces:**
- Produces: `ACCEPTANCE_CASES`, `AcceptanceId`, `AcceptanceResult`, `summarizeAcceptance(results)` and JSON schema version `v1`.
- Consumes: acceptance IDs and completion rules from the approved spec.

- [ ] **Step 1: Write the failing catalog invariant test**

```ts
import { describe, expect, it } from "vitest"
import { ACCEPTANCE_CASES } from "./catalog"

describe("acceptance catalog", () => {
  it("keeps stable unique IDs and covers every required family", () => {
    const ids = ACCEPTANCE_CASES.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(ACCEPTANCE_CASES.map((item) => item.family))).toEqual(
      new Set(["lifecycle", "ports", "apps", "terminal", "actions", "doctor", "workspace", "command", "navigation", "native", "settings", "accessibility", "visual", "installer"]),
    )
    expect(ACCEPTANCE_CASES.filter((item) => item.required).length).toBeGreaterThanOrEqual(70)
  })
})
```

- [ ] **Step 2: Run the focused test and witness RED**

Run: `pnpm --filter @matriz/app-matriz-desktop test -- src/acceptance/catalog.test.ts`

Expected: FAIL because `./catalog` does not exist.

- [ ] **Step 3: Implement the immutable catalog**

```ts
export type AcceptanceFamily =
  | "lifecycle" | "ports" | "apps" | "terminal" | "actions" | "doctor"
  | "workspace" | "command" | "navigation" | "native" | "settings"
  | "accessibility" | "visual" | "installer"

export interface AcceptanceCase {
  readonly id: string
  readonly family: AcceptanceFamily
  readonly title: string
  readonly required: boolean
  readonly risk: "critical" | "important" | "minor"
  readonly targets: readonly ("installed-baseline" | "source-runtime" | "packaged-candidate")[]
}

const BASE_IDS = [
  ...range("LIFE", 8), ...range("PORT", 8), ...range("TERM", 11),
  ...range("ACT", 3), ...range("DOC", 2), "GIT-001", "JUMP-001",
  ...range("CMD", 4), ...range("NAV", 3), ...range("NATIVE", 6),
  ...range("SET", 3), ...range("A11Y", 3), ...range("VIS", 3), ...range("INST", 6),
] as const
const APP_IDS = ["matriz-hub", "spot", "matriz-admin", "contracts", "willdash", "matriz-workbench", "sites", "matrizlib", "seumei"] as const
const APP_ACTIONS = ["START", "READY", "STOP", "RESTART"] as const

export const ACCEPTANCE_CASES = Object.freeze([
  ...BASE_IDS.map(toAcceptanceCase),
  ...APP_IDS.flatMap((appId) => APP_ACTIONS.map((action) => toAppAcceptanceCase(appId, action))),
])
```

`range`, `toAcceptanceCase` and `toAppAcceptanceCase` assign the exact family,
title, risk and targets declared in the spec. Tests assert all 98 IDs and the
nine canonical app IDs rather than only checking a minimum count.

- [ ] **Step 4: Write failing verdict tests**

```ts
it("is Ready only when every required packaged case passes twice", () => {
  const results = completeResults({ runs: 2, status: "pass" })
  expect(summarizeAcceptance(results).verdict).toBe("ready")
})

it("is Not Ready for any critical or important failure", () => {
  const results = completeResults({ runs: 2, status: "pass", override: { id: "TERM-010", status: "fail" } })
  expect(summarizeAcceptance(results).verdict).toBe("not-ready")
})

it("is Blocked when a required case has evidenced external blockage", () => {
  const results = completeResults({ runs: 2, status: "pass", override: { id: "INST-003", status: "blocked" } })
  expect(summarizeAcceptance(results).verdict).toBe("blocked")
})
```

- [ ] **Step 5: Implement result types and summary**

```ts
export interface AcceptanceResult {
  readonly schemaVersion: "v1"
  readonly runId: string
  readonly id: string
  readonly target: "installed-baseline" | "source-runtime" | "packaged-candidate"
  readonly status: "pass" | "fail" | "blocked" | "not-applicable"
  readonly startedAt: string
  readonly durationMs: number
  readonly commit?: string
  readonly artifactSha256?: string
  readonly summary: string
  readonly evidence: readonly string[]
}

export function summarizeAcceptance(results: readonly AcceptanceResult[]) {
  const packaged = results.filter((result) => result.target === "packaged-candidate")
  const runIds = new Set(packaged.map((result) => result.runId))
  const unresolved = requiredCasesWithoutPassInEveryRun(packaged, runIds)
  const blocked = unresolved.some((result) => result.status === "blocked")
  return { verdict: blocked ? "blocked" : unresolved.length || runIds.size < 2 ? "not-ready" : "ready", unresolved }
}
```

- [ ] **Step 6: Add a strict JSON Schema mirroring `AcceptanceResult`**

Require `schemaVersion`, `runId`, `id`, `target`, `status`, `startedAt`, `durationMs`, `summary` and `evidence`; disallow additional properties and constrain all enums exactly.

- [ ] **Step 7: Run focused tests and app gates**

Run:

```powershell
pnpm --filter @matriz/app-matriz-desktop test -- src/acceptance
pnpm --filter @matriz/app-matriz-desktop typecheck
pnpm --filter @matriz/app-matriz-desktop lint
```

Expected: all exit `0`.

- [ ] **Step 8: Commit the acceptance contract**

```powershell
git add apps/matriz-desktop/src/acceptance apps/matriz-desktop/acceptance/results.schema.json
git commit -m "test(desktop): define native acceptance contract"
```

### Task 2: Make the IPC command surface exhaustively testable

**Files:**
- Create: `apps/matriz-desktop/src/integration/tauri/command-contract.ts`
- Create: `apps/matriz-desktop/src/integration/tauri/command-contract.test.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/tauri-gateway.ts`
- Create: `apps/matriz-desktop/src-tauri/src/command_contract.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Create: `apps/matriz-desktop/src-tauri/tests/command_contract.rs`

**Interfaces:**
- Produces: `TAURI_COMMAND_CONTRACT` in TypeScript and `command_contract::COMMAND_NAMES` in Rust.
- Consumes: every current `DesktopGateway` method; no new privileged capability.

- [ ] **Step 1: Write a failing serialization matrix**

```ts
const cases = [
  ["snapshot", "get_snapshot", undefined],
  ["startApp", "start_app", { appId: "matriz-hub" }],
  ["writeTerminal", "write_terminal", { sessionId: "term-1", data: "echo ok\r" }],
  ["resizeTerminal", "resize_terminal", { sessionId: "term-1", columns: 120, rows: 40 }],
  ["startManagedOperation", "start_managed_operation", { operationId: "gate.lint" }],
] as const

it.each(cases)("%s invokes only %s", async (method, command, args) => {
  const invoke = vi.fn().mockResolvedValue(undefined)
  const gateway = createTauriGateway(invoke)
  await callGateway(gateway, method)
  expect(invoke).toHaveBeenCalledWith(command, args)
})
```

The table contains all 26 gateway methods listed in `DesktopGateway`; the test
also asserts that its method-name set equals `Object.keys(TAURI_COMMAND_CONTRACT)`.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @matriz/app-matriz-desktop test -- src/integration/tauri/command-contract.test.ts`

Expected: FAIL because the command contract and full method caller do not exist.

- [ ] **Step 3: Implement the TS contract and refactor the gateway to consume it**

```ts
export const TAURI_COMMAND_CONTRACT = Object.freeze({
  snapshot: "get_snapshot",
  kill: "terminate_process",
  killMany: "terminate_processes",
  startApp: "start_app",
  stopApp: "stop_app",
  appStatuses: "get_app_statuses",
  runGate: "run_gate",
  openTarget: "open_target",
  selectWorkspace: "select_workspace",
  doctor: "run_doctor",
  workspacePulse: "get_workspace_pulse",
  readSettings: "read_settings",
  writeSettings: "write_settings",
  hide: "hide_window",
  quit: "quit_app",
  createTerminal: "create_terminal",
  writeTerminal: "write_terminal",
  resizeTerminal: "resize_terminal",
  interruptTerminal: "interrupt_terminal",
  closeTerminal: "close_terminal",
  listTerminals: "list_terminals",
  subscribeTerminal: "subscribe_terminal",
  startManagedOperation: "start_managed_operation",
  getNativeAppRuntime: "get_native_app_runtime",
  installNativeApp: "install_native_app",
  startNativeApp: "start_native_app",
} as const)
```

- [ ] **Step 4: Write the Rust denial/inventory test**

```rust
#[test]
fn native_commands_expose_no_generic_authority() {
    let names = matriz_desktop_native::command_contract::COMMAND_NAMES;
    assert!(!names.iter().any(|name| matches!(*name, "exec" | "shell" | "read_file" | "kill_by_name" | "open_url")));
    assert_eq!(names.len(), 26);
}
```

- [ ] **Step 5: Export a Rust command inventory matching `generate_handler!`**

Add `pub mod command_contract;` and a `pub const COMMAND_NAMES: &[&str]`. Keep the existing private Tauri handlers; do not make command functions public.

- [ ] **Step 6: Run TS and Rust focused tests**

```powershell
pnpm --filter @matriz/app-matriz-desktop test -- src/integration/tauri
cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --test command_contract
```

Expected: all pass.

- [ ] **Step 7: Commit**

```powershell
git add apps/matriz-desktop/src/integration/tauri apps/matriz-desktop/src-tauri/src apps/matriz-desktop/src-tauri/tests/command_contract.rs
git commit -m "test(desktop): cover complete IPC command surface"
```

### Task 3: Build the safe Windows inspection and installer harness

**Files:**
- Create: `apps/matriz-desktop/acceptance/windows/matriz-control-acceptance.ps1`
- Create: `apps/matriz-desktop/acceptance/windows/probe-listener.ps1`
- Create: `apps/matriz-desktop/acceptance/windows/acceptance-script.test.ts`
- Modify: `apps/matriz-desktop/package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `acceptance:inspect`, `acceptance:package`, `acceptance:installed` scripts and versioned result JSON under `output/matriz-control-acceptance/<runId>`.
- Consumes: the `v1` result schema and only resolved literal paths.

- [ ] **Step 1: Write failing safety tests**

```ts
it("inspection emits version, hash and executable path without changing installation", () => {
  const result = runAcceptance(["-Mode", "Inspect", "-OutputRoot", tempOutput])
  expect(result.status).toBe(0)
  expect(readJson(result.stdout)).toMatchObject({ schemaVersion: "v1", productName: "Matriz Control" })
})

it("rejects output paths outside the declared acceptance root", () => {
  const result = runAcceptance(["-Mode", "Cleanup", "-OutputRoot", workspaceRoot])
  expect(result.status).not.toBe(0)
  expect(result.stderr).toContain("Unsafe acceptance output path")
})
```

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @matriz/app-matriz-desktop test -- acceptance-script.test.ts`

Expected: FAIL because the harness does not exist and Vitest does not include acceptance tests.

- [ ] **Step 3: Extend Vitest include and add package scripts**

```json
{
  "scripts": {
    "acceptance:inspect": "pwsh -NoProfile -File ./acceptance/windows/matriz-control-acceptance.ps1 -Mode Inspect",
    "acceptance:package": "pwsh -NoProfile -File ./acceptance/windows/matriz-control-acceptance.ps1 -Mode Package",
    "acceptance:installed": "pwsh -NoProfile -File ./acceptance/windows/matriz-control-acceptance.ps1 -Mode Installed"
  }
}
```

Add `acceptance/**/*.test.ts` to Vitest's `include`.

- [ ] **Step 4: Implement explicit modes and path guards**

```powershell
param(
  [ValidateSet('Inspect','Package','Installed','Cleanup')]
  [string]$Mode,
  [string]$OutputRoot = (Join-Path $PSScriptRoot '..\..\..\..\output\matriz-control-acceptance')
)

$resolvedWorkspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..'))
$resolvedOutput = [IO.Path]::GetFullPath($OutputRoot)
$allowedOutput = [IO.Path]::GetFullPath((Join-Path $resolvedWorkspace 'output\matriz-control-acceptance'))
if (-not $resolvedOutput.StartsWith($allowedOutput, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Unsafe acceptance output path'
}
```

Use `Start-Process -Wait -PassThru`, `Get-FileHash`, `Get-Process`, `Get-NetTCPConnection` and literal paths. Never build a shell command string.

- [ ] **Step 5: Add a test-owned listener probe**

The probe binds only the requested loopback port, prints its PID/readiness as JSON and exits on stdin/parent termination. The harness records its PID and always stops that exact PID in `finally`.

- [ ] **Step 6: Capture Target A without replacing it**

Run: `pnpm --filter @matriz/app-matriz-desktop acceptance:inspect`

Expected: JSON contains installed `0.1.0`, SHA-256 `712F6F...` if unchanged, and no files/processes are modified.

- [ ] **Step 7: Run tests and diff audit**

```powershell
pnpm --filter @matriz/app-matriz-desktop test -- acceptance-script.test.ts
git diff --check
git status --short
```

Expected: tests pass; only source/lock changes are visible; output is ignored.

- [ ] **Step 8: Commit**

```powershell
git add apps/matriz-desktop/acceptance/windows apps/matriz-desktop/package.json apps/matriz-desktop/vitest.config.ts .gitignore pnpm-lock.yaml
git commit -m "test(desktop): add safe Windows acceptance harness"
```

### Task 4: Add acceptance-profile Tauri WebdriverIO

**Files:**
- Modify: `apps/matriz-desktop/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/matriz-desktop/src-tauri/Cargo.toml`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Create: `apps/matriz-desktop/src/e2e/enable-wdio.ts`
- Modify: `apps/matriz-desktop/src/main.tsx`
- Create: `apps/matriz-desktop/src-tauri/capabilities/acceptance.json`
- Create: `apps/matriz-desktop/wdio.conf.ts`
- Create: `apps/matriz-desktop/acceptance/e2e/navigation.e2e.ts`

**Interfaces:**
- Produces: `pnpm e2e:build` and `pnpm e2e:run`; `acceptance` Cargo feature.
- Consumes: current Tauri window and accessible UI. This acceptance-profile
  binary is Target B (`source-runtime`) and records its commit plus executable
  hash in every result. Production `package` explicitly disables the feature.

- [ ] **Step 1: Install pinned acceptance dependencies**

```powershell
pnpm --filter @matriz/app-matriz-desktop add -D webdriverio@9.31.1 @wdio/cli@9.31.1 @wdio/local-runner@9.31.1 @wdio/mocha-framework@9.31.1 @wdio/spec-reporter@9.31.1 @wdio/tauri-service@1.3.0 @wdio/tauri-plugin@1.3.0
```

- [ ] **Step 2: Write the failing plugin/navigation E2E**

```ts
describe("Matriz Control acceptance", () => {
  it("opens every primary mode with keyboard-reachable controls", async () => {
    await expect($("[data-acceptance='control-shell']")).toBeDisplayed()
    for (const name of ["Portas", "Apps", "Terminal", "Ações", "Doctor", "Preferências"]) {
      const control = await $(`button=${name}`)
      await expect(control).toBeClickable()
      await control.click()
      await expect($("main")).toHaveAttribute("data-active-view", expect.stringMatching(/.+/))
    }
  })
})
```

- [ ] **Step 3: Run RED**

Run: `pnpm --filter @matriz/app-matriz-desktop e2e:run`

Expected: FAIL because config, acceptance binary and scripts do not exist.

- [ ] **Step 4: Add optional Rust dependencies and feature**

```toml
[features]
acceptance = ["dep:tauri-plugin-wdio", "dep:tauri-plugin-wdio-webdriver"]

[dependencies]
tauri-plugin-wdio = { version = "1.3.0", optional = true }
tauri-plugin-wdio-webdriver = { version = "1.3.0", optional = true }
```

Register both plugins only under `#[cfg(feature = "acceptance")]`. Production `cargo tauri build` receives no `acceptance` feature.

- [ ] **Step 5: Gate the guest import**

```ts
export async function enableWdioForAcceptance() {
  if (import.meta.env.MODE === "acceptance") await import("@wdio/tauri-plugin")
}
```

Call it before React mount only in acceptance mode.

- [ ] **Step 6: Configure one-worker embedded WDIO**

```ts
export const config = {
  runner: "local",
  maxInstances: 1,
  framework: "mocha",
  specs: ["./acceptance/e2e/**/*.e2e.ts"],
  services: [["@wdio/tauri-service", { driverProvider: "embedded", embeddedPort: 4445 }]],
  capabilities: [{ browserName: "tauri", "tauri:options": { application: "./src-tauri/target/release/matriz-control.exe" } }],
  reporters: ["spec"],
}
```

- [ ] **Step 7: Add minimal stable acceptance attributes**

Add `data-acceptance` only to semantic surface roots where accessible roles/names are insufficient. Do not encode layout position or styling.

- [ ] **Step 8: Prove acceptance plugin absence from production**

Run:

```powershell
pnpm --filter @matriz/app-matriz-desktop e2e:build
pnpm --filter @matriz/app-matriz-desktop e2e:run
pnpm --filter @matriz/app-matriz-desktop package
rg -a "wdio" apps/matriz-desktop/src-tauri/target/release/matriz-control.exe
```

Expected: E2E passes; production package passes; final `rg` returns no plugin marker.

- [ ] **Step 9: Commit**

```powershell
git add apps/matriz-desktop pnpm-lock.yaml
git commit -m "test(desktop): drive native renderer with WebdriverIO"
```

### Task 5: Cover and repair terminal, app and process lifecycles

**Files:**
- Create: `apps/matriz-desktop/acceptance/e2e/terminal.e2e.ts`
- Create: `apps/matriz-desktop/acceptance/e2e/apps.e2e.ts`
- Modify: `apps/matriz-desktop/src/ui/terminal/terminal-store.ts`
- Modify: `apps/matriz-desktop/src/ui/terminal/use-terminal-runtime.ts`
- Modify: `apps/matriz-desktop/src/ui/terminal/terminal-view.tsx`
- Modify: `apps/matriz-desktop/src/ui/app.tsx`
- Modify: `apps/matriz-desktop/src-tauri/src/terminal.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/workspace.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/state.rs`
- Test: corresponding TS/Rust focused tests beside each changed unit.

**Interfaces:**
- Produces: deterministic E2E probes for TERM-001..011, PORT-001..008 and app start/ready/stop/restart IDs.
- Consumes: safe listener probe, acceptance result writer and typed managed-operation catalog.

- [ ] **Step 1: Write terminal E2E probes**

Use unique marker `MATRIZ_ACCEPTANCE_<runId>`, `Get-Location`, Unicode `ação_✓`, a cancellable loop and six-tab creation. Assert visible output, tab status, interruption and zero terminal sessions after controlled exit.

- [ ] **Step 2: Write app lifecycle E2E probes**

Start each catalog app through its visible action, assert its managed terminal and fixed command, wait for the canonical port, stop, assert port release, restart and assert exactly one owned managed session.

- [ ] **Step 3: Run the family and record every RED finding**

Run:

```powershell
pnpm --filter @matriz/app-matriz-desktop e2e:run --spec acceptance/e2e/terminal.e2e.ts
pnpm --filter @matriz/app-matriz-desktop e2e:run --spec acceptance/e2e/apps.e2e.ts
```

Expected: failures are captured as acceptance results, not suppressed.

- [ ] **Step 4: Fix one root-cause group at a time with a narrow regression test**

For each failure, add a TS or Rust test that fails without the fix. Examples:

```rust
#[test]
fn stopping_owned_app_releases_its_listener_without_killing_external_owner() {
    let fixture = TestOwnedAndExternalListeners::start();
    fixture.operations.stop_app("matriz-hub").unwrap();
    assert!(fixture.owned_listener.wait_for_exit());
    assert!(fixture.external_listener.is_running());
}
```

```ts
it("keeps terminal metadata after collapsing without retaining output in React state", () => {
  const store = createTerminalStore()
  store.reconcile([{ id: "term-1", title: "PowerShell", status: "running", kind: "shell" }])
  store.setDockState("collapsed")
  store.accept({ type: "output", sessionId: "term-1", sequence: 1, data: "secret-output" })
  expect(store.snapshot().sessions[0]?.status).toBe("running")
  expect(JSON.stringify(store.snapshot())).not.toContain("secret-output")
})
```

- [ ] **Step 5: Run focused, family and scoped gates after each group**

```powershell
pnpm --filter @matriz/app-matriz-desktop test
cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml
pnpm --filter @matriz/app-matriz-desktop e2e:run --spec acceptance/e2e/terminal.e2e.ts
pnpm --filter @matriz/app-matriz-desktop e2e:run --spec acceptance/e2e/apps.e2e.ts
```

- [ ] **Step 6: Commit each independently reviewable fix group**

Use messages such as:

```powershell
git commit -m "fix(desktop): reconcile managed app shutdown"
git commit -m "fix(desktop): preserve bounded terminal lifecycle"
git commit -m "fix(desktop): reject stale process actions"
```

Do not combine unrelated findings into one commit.

### Task 6: Certify navigation, settings, Doctor and Matriz Admin native lifecycle

**Files:**
- Extend: `apps/matriz-desktop/acceptance/e2e/navigation.e2e.ts`
- Create: `apps/matriz-desktop/acceptance/e2e/native-admin.e2e.ts`
- Modify: `apps/matriz-desktop/src/ui/app.tsx`
- Modify: `apps/matriz-desktop/src/ui/command-deck/command-deck.tsx`
- Modify: `apps/matriz-desktop/src-tauri/src/settings.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/doctor.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/native_apps.rs`

**Interfaces:**
- Produces: automated LIFE, ACT, DOC, GIT, JUMP, CMD, NAV, NATIVE and SET results.
- Consumes: Target C harness and exact Admin installer/runtime resolver.

- [ ] **Step 1: Add failing E2E cases for every non-terminal primary action**

Test keyboard navigation, Command Deck, confirmation, settings persistence, corrupt-settings recovery, Doctor states, workspace pulse and fixed jumps. Mocking is permitted only for deterministic renderer-only error presentation; native behavior uses real commands.

- [ ] **Step 2: Add native Admin lifecycle cases**

Exercise not-built → build → built → install → installed → running → installed. Tamper a copied test installer hash/path and prove rejection without touching the canonical artifact.

- [ ] **Step 3: Run RED and classify findings by spec priority**

Run: `pnpm --filter @matriz/app-matriz-desktop e2e:run --spec acceptance/e2e/navigation.e2e.ts --spec acceptance/e2e/native-admin.e2e.ts`

- [ ] **Step 4: Repair each Critical/Important finding using RED/GREEN focused tests**

Do not implement store download/update/uninstall UI. Native uninstall remains an external harness check in this cycle.

- [ ] **Step 5: Run all app-local gates**

```powershell
pnpm --filter @matriz/app-matriz-desktop test
pnpm --filter @matriz/app-matriz-desktop lint
pnpm --filter @matriz/app-matriz-desktop typecheck
cargo fmt --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml
```

- [ ] **Step 6: Commit coherent repair groups**

Use `fix(desktop): ...` commits scoped to settings, Doctor, command navigation or Admin lifecycle.

### Task 7: Add visual, accessibility and performance evidence

**Files:**
- Create: `apps/matriz-desktop/acceptance/e2e/visual.e2e.ts`
- Modify: `apps/matriz-desktop/src/ui/styles.css`
- Modify: `apps/matriz-desktop/src/ui/app.tsx`
- Modify: `apps/matriz-desktop/src/ui/terminal/terminal-view.tsx`
- Modify: `apps/matriz-desktop/src/ui/command-deck/command-deck.tsx`
- Create: `apps/matriz-desktop/acceptance/windows/measure-process.ps1`

**Interfaces:**
- Produces: screenshots and VIS/A11Y/performance result JSON for 420×560, 760×700 and 1440×900.
- Consumes: WDIO window control and exact Control PID from the harness.

- [ ] **Step 1: Write visual/a11y RED assertions**

For every primary view at each viewport, assert `scrollWidth <= clientWidth`, visible focused control after Tab, accessible names on interactive elements, reduced-motion computed durations and terminal usability.

- [ ] **Step 2: Capture deterministic screenshots**

Use stable test-owned states and save PNGs under `output/matriz-control-acceptance/<runId>/screenshots/<viewport>/<view>.png`.

- [ ] **Step 3: Add process measurement**

Sample the exact Control PID after warm idle for 30 seconds. Emit average CPU percentage, working set MB, startup-to-interactive duration and child PID list. Do not infer process identity by display name alone.

- [ ] **Step 4: Run the matrix and witness findings**

Run:

```powershell
pnpm --filter @matriz/app-matriz-desktop e2e:run --spec acceptance/e2e/visual.e2e.ts
$acceptancePid = Get-Content -Raw output/matriz-control-acceptance/current/process.json | ConvertFrom-Json | Select-Object -ExpandProperty pid
pwsh -NoProfile -File apps/matriz-desktop/acceptance/windows/measure-process.ps1 -Pid $acceptancePid
```

- [ ] **Step 5: Fix Critical/Important visual or accessibility findings**

Add component regression tests for every semantic fix and keep screenshots as evidence, not assertions against fragile pixels.

- [ ] **Step 6: Run React best-practice review and scoped gates**

Run the applicable React review skill after TSX changes, then test, lint, typecheck and E2E visual matrix.

- [ ] **Step 7: Commit**

```powershell
git add apps/matriz-desktop/src apps/matriz-desktop/acceptance/e2e/visual.e2e.ts apps/matriz-desktop/acceptance/windows/measure-process.ps1
git commit -m "fix(desktop): complete native accessibility matrix"
```

### Task 8: Repair and split Windows CI

**Files:**
- Modify: `.github/workflows/matriz-desktop.yml`
- Create: `.github/workflows/matriz-desktop-acceptance.yml`
- Modify: `apps/matriz-desktop/package.json`

**Interfaces:**
- Produces: PR `windows-installer` smoke and scheduled/manual `windows-acceptance` workflow.
- Consumes: all app-local test/package/acceptance scripts.

- [ ] **Step 1: Write a failing workflow contract smoke test**

Add a root smoke test that parses both workflow YAML files and asserts:

```ts
expect(workflowText).not.toContain("apps/seumei/desktop")
expect(workflowText).toContain("apps/matriz-admin/desktop")
expect(acceptanceWorkflow.on).toHaveProperty("schedule")
expect(acceptanceWorkflow.on).toHaveProperty("workflow_dispatch")
```

- [ ] **Step 2: Run RED**

Run: `pnpm vitest run tests/smoke/matriz-desktop-workflow.test.ts`

Expected: FAIL on stale Seumei paths and missing acceptance workflow.

- [ ] **Step 3: Correct the PR workflow**

Replace Seumei native paths/scripts/artifacts with Matriz Admin equivalents. Keep Control TS/Rust/package checks and upload both installers with checksums.

- [ ] **Step 4: Add the scheduled/manual workflow**

Use `windows-latest`, concurrency cancellation by ref, daily cron, `workflow_dispatch`, pnpm/Rust caches, acceptance-profile build, full installed harness, report/screenshots upload and `if: always()` diagnostics upload.

- [ ] **Step 5: Validate YAML and smoke tests**

```powershell
pnpm vitest run tests/smoke/matriz-desktop-workflow.test.ts
pnpm run test:smoke
git diff --check
```

- [ ] **Step 6: Commit**

```powershell
git add .github/workflows tests/smoke/matriz-desktop-workflow.test.ts apps/matriz-desktop/package.json
git commit -m "ci(desktop): run daily packaged acceptance"
```

### Task 9: Generate the audit, certify Target C twice and publish evidence

**Files:**
- Create: `apps/matriz-desktop/acceptance/generate-report.mjs`
- Create: `apps/matriz-desktop/acceptance/generate-report.test.mjs`
- Create: `apps/matriz-desktop/docs/ACCEPTANCE.md`
- Create: `docs/audit/2026-08-20-matriz-control-acceptance.md`
- Modify: `apps/matriz-desktop/README.md`
- Modify: `apps/matriz-desktop/docs/AGENT-START-HERE.md`
- Modify: `docs/DECISION-LOG.md`
- Generate ignored: `output/matriz-control-acceptance/final/Matriz-Control-Acceptance.docx`
- Generate ignored: `output/matriz-control-acceptance/final/Matriz-Control-Acceptance.pdf`

**Interfaces:**
- Produces: deterministic Markdown report, rendered DOCX/PDF, final acceptance JSON and Ready/Not Ready verdict.
- Consumes: all acceptance results, hashes, screenshots and performance evidence.

- [ ] **Step 1: Write failing report tests**

```js
test("report separates targets, redacts personal paths and prints verdict evidence", () => {
  const markdown = generateReport(fixtureResults)
  assert.match(markdown, /Installed baseline/)
  assert.match(markdown, /Packaged candidate/)
  assert.doesNotMatch(markdown, /C:\\Users\\taina/)
  assert.match(markdown, /Verdict: Ready/)
})
```

- [ ] **Step 2: Run RED**

Run: `node --test apps/matriz-desktop/acceptance/generate-report.test.mjs`

- [ ] **Step 3: Implement deterministic report generation**

Sort by acceptance catalog/family, show target/hash/run, before/finding/fix/after, screenshot references, performance, residual Minors and exact blockers. Redact user profile and workspace prefixes before rendering.

- [ ] **Step 4: Run fresh global gates before packaging**

```powershell
pnpm run build
pnpm run typecheck
pnpm run lint
pnpm run test:smoke
pnpm run prisma:validate
```

Supply only process-scoped validation database URLs; do not create `.env`.

- [ ] **Step 5: Build the final production installer**

Run: `pnpm --filter @matriz/app-matriz-desktop package`

Record installer/executable hashes and prove the acceptance plugin is absent.

- [ ] **Step 6: Execute two consecutive clean Target C runs**

```powershell
pnpm --filter @matriz/app-matriz-desktop acceptance:installed -- -RunId final-1
pnpm --filter @matriz/app-matriz-desktop acceptance:installed -- -RunId final-2
```

Expected: every required packaged result passes; install/open/exit/uninstall return zero twice; no orphan process remains.

- [ ] **Step 7: Generate Markdown, DOCX and PDF**

Use the documents skill and bundled workspace runtime. Render DOCX pages to PNG, inspect every page, correct clipping/orphans, then export/inspect PDF. The committed Markdown is the canonical source.

- [ ] **Step 8: Perform final tracked-file and security audit**

```powershell
git diff --check
git status --short
git ls-files | Select-String '(^|/)(target|dist|\.next|\.turbo|node_modules|output)/|\.(log|exe|msi)$'
git grep -I -n -E 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|postgres(ql)?://[^: ]+:[^@ ]+@'
```

Allow only documented placeholder URLs; fail on secrets or generated artifacts.

- [ ] **Step 9: Commit documentation and report source**

```powershell
git add apps/matriz-desktop/docs apps/matriz-desktop/README.md docs/audit/2026-08-20-matriz-control-acceptance.md docs/DECISION-LOG.md apps/matriz-desktop/acceptance/generate-report.mjs apps/matriz-desktop/acceptance/generate-report.test.mjs
git commit -m "docs(desktop): certify packaged control acceptance"
```

- [ ] **Step 10: Fetch, reconcile and reverify final commit**

Fetch `origin`, integrate `origin/main` only if it is no longer an ancestor, repeat the complete global suite after any merge, push `codex/matriz-desktop`, and confirm upstream `0 0` plus clean worktree.

## Plan completion criteria

- All nine tasks are committed with no untracked source.
- Target A remains an evidence baseline; Target C is the certified product.
- Every required acceptance ID has a structured result.
- Two consecutive Target C runs are green.
- No Critical or Important finding remains.
- Windows PR and daily workflows reference Matriz Admin, not removed Seumei native paths.
- Markdown, DOCX and PDF reports are visually verified and delivered.
- Production NSIS contains no WDIO test plugin/capability.
- Branch is pushed and synchronized without direct push to `main`.
