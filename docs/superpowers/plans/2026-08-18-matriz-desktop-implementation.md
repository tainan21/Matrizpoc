# Matriz Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, install and verify Matriz Control, the first Windows-native Matriz developer utility with nine operational features.

**Architecture:** A source-first React/Vite frontend consumes MatrizLib and talks through one typed `DesktopGateway`. A Tauri 2 Rust core owns every privileged operation through narrow commands, Win32 port/process APIs, allowlisted child processes and atomic AppData preferences. The app lives in `apps/matriz-desktop`; no shared desktop package is introduced.

**Tech Stack:** pnpm 9, TypeScript 5.6 strict, React 19, Vite 7, Vitest 2, Tauri 2.11, Rust 1.89 MSVC, Win32 APIs through `windows`, NSIS x64.

**Spec:** `docs/superpowers/specs/2026-08-18-matriz-desktop-design.md`

## Global Constraints

- Windows 11 x64 is the only verified v0.1 target.
- No generic shell, filesystem, URL, executable, or kill-by-name command may cross IPC.
- UI imports other workspaces only through public `@matriz/*` exports.
- Every production behavior starts with a failing test and observed RED.
- Root build remains cross-platform; installer packaging is a separate Windows command/workflow.
- Build output, installer, logs, `.env`, Cargo target and screenshots remain untracked.
- The executable never requests administrator privileges.

---

### Task 1: Register the native app and scaffold its public boundary

**Files:**
- Create: `apps/matriz-desktop/package.json`
- Create: `apps/matriz-desktop/AGENTS.md`
- Create: `apps/matriz-desktop/README.md`
- Create: `apps/matriz-desktop/docs/AGENT-START-HERE.md`
- Create: `apps/matriz-desktop/public-contract.ts`
- Create: `apps/matriz-desktop/src/manifest/manifest.ts`
- Create: `apps/matriz-desktop/src/bootstrap/index.ts`
- Modify: `packages/foundation/constants/src/index.ts`
- Modify: `packages/platform/config/src/index.ts`
- Modify: `tests/smoke/manifests.test.ts`
- Modify: `tests/smoke/registry.test.ts`
- Modify: `tests/smoke/public-contracts.test.ts`
- Modify: `apps/matriz-hub/src/bootstrap/index.ts`
- Modify: `vitest.config.ts`

**Interfaces:**
- Produces: app ID `matriz-desktop`, manifest-only public contract, base URL `matriz://control`.

- [ ] **Step 1: Write failing smoke expectations**

Add the desktop public contract to all manifest/registry fixtures and assert nine
enabled apps plus `monorepoConfig.baseUrls["matriz-desktop"] ===
"matriz://control"`.

- [ ] **Step 2: Run RED**

Run: `pnpm exec vitest run --config vitest.config.ts tests/smoke/manifests.test.ts tests/smoke/registry.test.ts tests/smoke/public-contracts.test.ts`

Expected: FAIL because `@apps/matriz-desktop/public-contract` and the app ID do not exist.

- [ ] **Step 3: Add the minimal manifest boundary**

The manifest has one route `/`, capabilities for ports, launcher and local
health, no events, no integrations, no onboarding, and manifest-only
`public-contract.ts`. Add the ninth domain-free app ID and `matriz://control`
configuration. Hub bootstrap may register the manifest but must not import
desktop internals.

- [ ] **Step 4: Run GREEN and boundary checks**

Run the focused smoke command plus
`pnpm tsx tooling/scripts/verify-app-boundaries.ts matriz-desktop`.

- [ ] **Step 5: Commit**

Commit: `feat(desktop): register native control app`

### Task 2: Establish the typed frontend boundary and Vite build

**Files:**
- Create: `apps/matriz-desktop/index.html`
- Create: `apps/matriz-desktop/vite.config.ts`
- Create: `apps/matriz-desktop/vitest.config.ts`
- Create: `apps/matriz-desktop/tsconfig.json`
- Create: `apps/matriz-desktop/src/main.tsx`
- Create: `apps/matriz-desktop/src/domain/types.ts`
- Create: `apps/matriz-desktop/src/application/desktop-gateway.ts`
- Create: `apps/matriz-desktop/src/application/catalog.ts`
- Create: `apps/matriz-desktop/src/application/catalog.test.ts`
- Create: `apps/matriz-desktop/src/integration/tauri/tauri-gateway.ts`
- Create: `apps/matriz-desktop/src/integration/unavailable-gateway.ts`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `DesktopGateway` with `snapshot`, `kill`, `killMany`, `startApp`,
  `stopApp`, `runGate`, `openTarget`, `readSettings`, `writeSettings`, and
  `subscribe` methods.
- Produces: canonical `MATRIZ_DESKTOP_APPS`, `GATES`, and `QUICK_TARGETS`.

- [ ] **Step 1: Write catalog and adapter contract tests**

Assert eight unique ports 3000–3007, fixed package filters, four gate IDs, no
free-form command property, and serialization of typed invoke payloads.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @matriz/app-matriz-desktop test`.

Expected: FAIL because the catalog and gateway do not exist.

- [ ] **Step 3: Implement the domain types and gateways**

Use discriminated unions:

```ts
type RuntimeState = "free" | "external" | "starting" | "ready" | "degraded"
type GateId = "typecheck" | "lint" | "test:smoke" | "prisma:validate"
type QuickTargetId = "workspace" | "terminal" | "hub" | "matrizlib" | "workbench"
```

The unavailable adapter returns an explicit `backend-unavailable` snapshot; it
never fabricates processes or health.

- [ ] **Step 4: Run tests, typecheck, lint and Vite build**

Run: package `test`, `typecheck`, `lint`, and `build`.

- [ ] **Step 5: Commit**

Commit: `feat(desktop): establish typed native gateway`

### Task 3: Implement safe Windows port and process control

**Files:**
- Create: `apps/matriz-desktop/src-tauri/Cargo.toml`
- Create: `apps/matriz-desktop/src-tauri/build.rs`
- Create: `apps/matriz-desktop/src-tauri/src/main.rs`
- Create: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Create: `apps/matriz-desktop/src-tauri/src/ports.rs`
- Create: `apps/matriz-desktop/src-tauri/src/processes.rs`
- Create: `apps/matriz-desktop/src-tauri/src/state.rs`
- Create: `apps/matriz-desktop/src-tauri/tauri.conf.json`
- Create: `apps/matriz-desktop/src-tauri/capabilities/main.json`

**Interfaces:**
- Produces Rust commands `get_snapshot`, `terminate_process`, and
  `terminate_processes`.
- `terminate_process` consumes `{ pid: u32, snapshot_id: String }` and returns a
  fresh `DesktopSnapshot`.

- [ ] **Step 1: Write Rust tests for snapshot authorization**

Cover PID 0, PID 4, self PID, stale snapshot, missing PID, duplicate PIDs and a
valid observed user process. Unit tests use injected enumerator/terminator
traits; assertions target authorization outcomes, not mocks.

- [ ] **Step 2: Run RED**

Run: `cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml`.

Expected: FAIL because port enumeration and authorization are absent.

- [ ] **Step 3: Implement Win32 enumeration and termination**

Use `GetExtendedTcpTable` with owner-PID listener tables for IPv4 and IPv6.
Resolve executable name/path with minimum query rights. Terminate only PIDs in
the current server-side snapshot using `OpenProcess(PROCESS_TERMINATE |
SYNCHRONIZE)` and `TerminateProcess`; close every handle.

- [ ] **Step 4: Run GREEN plus a real read-only enumeration test**

Run Cargo tests, `cargo fmt --check`, and
`cargo clippy --manifest-path ... -- -D warnings`.

- [ ] **Step 5: Commit**

Commit: `feat(desktop): add safe port process control`

### Task 4: Add workspace validation, launcher, readiness, Git, doctor and gates

**Files:**
- Create: `apps/matriz-desktop/src-tauri/src/catalog.rs`
- Create: `apps/matriz-desktop/src-tauri/src/workspace.rs`
- Create: `apps/matriz-desktop/src-tauri/src/tasks.rs`
- Create: `apps/matriz-desktop/src-tauri/src/doctor.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/state.rs`

**Interfaces:**
- Produces commands `select_workspace`, `start_app`, `stop_app`, `run_gate`,
  `get_workspace_pulse`, `run_doctor`, and `open_target`.
- All commands consume catalog IDs, never executable names or argument arrays.

- [ ] **Step 1: Write failing Rust tests**

Use a temporary workspace fixture. Assert rejection without canonical
`package.json`/`pnpm-workspace.yaml`, exact allowlisted pnpm args, single active
gate, 200-line ring buffer, readiness derivation, and unknown target rejection.

- [ ] **Step 2: Run RED**

Run focused Cargo tests and confirm failures are missing behavior.

- [ ] **Step 3: Implement minimal operational services**

Spawn `pnpm.cmd` directly with fixed args and `CREATE_NO_WINDOW`; capture
stdout/stderr. Managed app stop first requests child kill and then process-tree
cleanup only for the recorded child. Git/doctor commands are fixed executables
with fixed arguments and five-second timeouts. Quick targets resolve from the
embedded catalog.

- [ ] **Step 4: Run GREEN and security mutation checks**

Verify unknown app/gate/target IDs and malformed workspace paths fail. Run
Cargo test/fmt/clippy.

- [ ] **Step 5: Commit**

Commit: `feat(desktop): add ecosystem operations`

### Task 5: Add preferences, tray, shortcut and native lifecycle

**Files:**
- Create: `apps/matriz-desktop/src-tauri/src/settings.rs`
- Create: `apps/matriz-desktop/src-tauri/src/shell.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Modify: `apps/matriz-desktop/src-tauri/Cargo.toml`
- Modify: `apps/matriz-desktop/src-tauri/capabilities/main.json`

**Interfaces:**
- Produces commands `get_settings`, `set_settings`, `hide_window`, and
  lifecycle events `desktop://visibility` and `desktop://snapshot`.

- [ ] **Step 1: Write settings and close-policy tests**

Assert defaults, normalization of volume 0–1, atomic rewrite, corrupt-file
fallback, `hide` versus `quit`, and five-second polling only when visible.

- [ ] **Step 2: Run RED**

Run focused Cargo tests.

- [ ] **Step 3: Implement settings and shell**

Persist one versioned JSON file in app-local data using temp-file + rename.
Create tray actions Show/Hide, Refresh and Exit. Register one
`Ctrl+Shift+M` shortcut through the official plugin. Closing hides by default;
Exit stops managed children and emits nonblocking `system.end` intent.

- [ ] **Step 4: Run GREEN, fmt and clippy**

- [ ] **Step 5: Commit**

Commit: `feat(desktop): add native lifecycle preferences`

### Task 6: Build the compact Matriz control surface

**Files:**
- Create: `apps/matriz-desktop/src/ui/app.tsx`
- Create: `apps/matriz-desktop/src/ui/app.test.tsx`
- Create: `apps/matriz-desktop/src/ui/use-desktop.ts`
- Create: `apps/matriz-desktop/src/ui/presenters.ts`
- Create: `apps/matriz-desktop/src/ui/presenters.test.ts`
- Create: `apps/matriz-desktop/src/ui/icons.tsx`
- Create: `apps/matriz-desktop/src/ui/styles.css`
- Modify: `apps/matriz-desktop/src/main.tsx`

**Interfaces:**
- Consumes only `DesktopGateway` and public design/sound exports.
- Produces one window with views `ports`, `apps`, `actions`, `doctor`, and
  `settings`.

- [ ] **Step 1: Write failing presenter and interaction tests**

Cover sorting Matriz ports first, search, selection, accessible status names,
single kill, compact multi-kill confirmation, launcher state, one gate at a
time, quick targets, settings and keyboard focus.

- [ ] **Step 2: Run RED**

Run package tests and confirm missing UI behavior.

- [ ] **Step 3: Implement the minimal UI**

Use public `@matriz/design-ui` primitives where they fit and app-local compact
controls where desktop density requires. Render no explanatory paragraphs.
Use `@matriz/design-system/css`, a dark technical palette, 44 px destructive
targets, visible focus, aria-live for results and reduced-motion CSS.

- [ ] **Step 4: Integrate Matriz sounds opt-in**

Call the public sound abstraction for startup after user activation,
interaction, success and error. Never reference audio files or `Audio`.

- [ ] **Step 5: Run GREEN, typecheck, lint and build**

- [ ] **Step 6: Commit**

Commit: `feat(desktop): build compact control surface`

### Task 7: Package Windows assets and installer

**Files:**
- Create: `apps/matriz-desktop/src-tauri/icons/icon.svg`
- Generate: required Tauri PNG/ICO assets with `pnpm tauri icon`
- Modify: `apps/matriz-desktop/src-tauri/tauri.conf.json`
- Modify: `.gitignore`
- Create: `.github/workflows/matriz-desktop.yml`
- Modify: `docs/DECISION-LOG.md`
- Modify: `docs/app-ownership-map.md`
- Modify: `docs/monorepo-structure.md`
- Modify: `apps/matriz-desktop/README.md`

**Interfaces:**
- Produces `pnpm --filter @matriz/app-matriz-desktop package` and NSIS per-user
  installer.

- [ ] **Step 1: Add executable packaging verification**

Create a package script that fails unless exactly one `*-setup.exe` exists and
prints path, bytes and SHA-256. It must execute the artifact inspection, not
grep configuration.

- [ ] **Step 2: Configure the bundle**

Set identifier `com.matriz.control`, product `Matriz Control`, x64 NSIS,
`perUser`, Portuguese/English installer languages and WebView2 downloaded
bootstrapper fallback. Keep updater disabled and document unsigned status.

- [ ] **Step 3: Add Windows CI and concise docs**

CI installs pnpm/Rust, runs TS and Rust gates, builds frontend and uploads the
installer. Docs cover architecture, dev/build/package, adding a cataloged
feature, limitations and MatrizLib integration.

- [ ] **Step 4: Generate installer and verify artifact**

Run package + artifact verifier on Windows.

- [ ] **Step 5: Commit**

Commit: `build(desktop): package Windows installer`

### Task 8: Validate installed product and refine

**Files:**
- Create: `apps/matriz-desktop/scripts/verify-installed.ps1`
- Create: `apps/matriz-desktop/docs/VERIFICATION.md`
- Modify app files only for defects reproduced by a failing test.

**Interfaces:**
- Produces a repeatable install/launch/persist/tray/uninstall verification.

- [ ] **Step 1: Install silently into the current user**

Run the NSIS installer with `/S`, verify install directory, shortcuts and the
uninstaller. Record exact artifact hash.

- [ ] **Step 2: Launch and validate all nine features**

Use the installed executable, a disposable listening process and a safe test
workspace. Verify read-only enumeration before killing only the disposable
PID. Run one allowlisted gate, open one allowlisted route, toggle settings,
hide/show via tray/shortcut and verify persistence after restart.

- [ ] **Step 3: Measure**

Record cold interactive time, idle working set, idle CPU sample, executable
size and installer size. If a target is missed, diagnose and add a regression
test before changing production.

- [ ] **Step 4: Uninstall**

Run the uninstaller silently and verify executable, shortcuts and running
process are removed. User preference retention must match the documented
choice.

- [ ] **Step 5: Commit evidence**

Commit: `test(desktop): verify installed Windows utility`

### Task 9: Final monorepo gates, review and integration

**Files:**
- Modify only files required by verified failures.

- [ ] **Step 1: Run desktop gates fresh**

Run package test/typecheck/lint/build, Cargo test/fmt/clippy, Tauri package and
installed verification.

- [ ] **Step 2: Run global gates fresh**

Run `pnpm run build`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run
test:smoke`, `pnpm run prisma:validate`, and boundary verification.

- [ ] **Step 3: Audit security and repository hygiene**

Confirm no generic command surface, deep app imports, secrets, `.env`, logs,
Cargo target, installer or caches are tracked. Run `git diff --check`.

- [ ] **Step 4: Review requirements line by line**

Reconcile all nine features, installer lifecycle, MatrizLib usage, performance
targets, Windows-only limits and wallpaper deferral against the spec.

- [ ] **Step 5: Integrate Git**

Fetch `origin`, merge `origin/main` only if it is not an ancestor, repeat all
affected gates, push `codex/matriz-desktop`, and verify upstream 0/0 with a
clean worktree.
