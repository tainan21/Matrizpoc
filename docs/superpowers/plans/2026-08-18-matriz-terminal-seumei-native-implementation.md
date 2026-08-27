# Matriz Terminal and Seumei Native Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real multi-tab PowerShell terminal and command deck to Matriz Control, then ship an independently functional Seumei Windows installer that Control can build, install and launch.

**Architecture:** Matriz Control owns ConPTY sessions in app-local Rust and streams ordered chunks to xterm.js through Tauri channels. Managed UI actions remain allowlisted catalog operations even though explicitly opened terminal sessions accept normal user console input. Seumei Desktop lives under the existing Seumei app, reuses its app-local domain/use cases/presenters, and adds only a Vite/Tauri delivery shell with local browser storage.

**Tech Stack:** Tauri 2.11, Rust 2021, `portable-pty` 0.9, React 19, Vite 5, `@xterm/xterm` 6.0, `@xterm/addon-fit` 0.11, Vitest 2, MatrizLib, NSIS.

**Spec:** `docs/superpowers/specs/2026-08-18-matriz-terminal-seumei-native-design.md`

## Global Constraints

- Windows x64 is the only packaged target in this release.
- Do not import another app's `src/**` or `app/**`; Seumei Desktop remains inside `apps/seumei`.
- No renderer endpoint may accept a generic executable, elevated request, URL or hidden command string.
- Arbitrary input is accepted only by an explicit user-created terminal session and runs as the current user.
- Maximum six live PTY sessions; IDs are generated in Rust; output retention and transport chunks are bounded.
- Seumei Desktop must start and remain usable without Hub, Node, pnpm, a database or a listening port.
- UI consumes view models, not raw Seumei domain entities.
- No download action is exposed before a trusted signed release channel exists.
- Production behavior follows RED → GREEN → REFACTOR; generated Tauri files and static configuration are the only test-first exceptions.
- Build outputs, installers, terminal output, `.env`, `.next`, `dist` and Rust `target` remain untracked.

---

### Task 1: Define the terminal and native-launch contracts

**Files:**
- Modify: `apps/matriz-desktop/src/domain/types.ts`
- Modify: `apps/matriz-desktop/src/application/desktop-gateway.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/tauri-gateway.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/tauri-gateway.test.ts`
- Modify: `apps/matriz-desktop/src/integration/unavailable-gateway.ts`
- Modify: `apps/matriz-desktop/src/application/catalog.ts`
- Modify: `apps/matriz-desktop/src/application/catalog.test.ts`

**Interfaces:**
- Produces: `TerminalSession`, `TerminalStatus`, `TerminalChunk`, `TerminalCreateRequest`, `ManagedOperationId`, `NativeAppRuntime` and the corresponding `DesktopGateway` methods.
- Consumes: existing `DesktopAppId`, `GateId`, `DesktopSettings` and typed Tauri `Invoke`.

- [ ] **Step 1: Write failing catalog and gateway tests**

Add literal expectations proving that `app.seumei.web`, `app.seumei.native.build`, `app.seumei.native.install`, `app.seumei.native.start` and all four gates are known managed-operation IDs; verify exact command names and camelCase payloads for create/write/resize/interrupt/close/list/subscribe and native-state calls.

- [ ] **Step 2: Run the focused tests and witness RED**

Run:

```powershell
corepack pnpm --filter @matriz/app-matriz-desktop test -- src/application/catalog.test.ts src/integration/tauri/tauri-gateway.test.ts
```

Expected: failures because terminal/native types, catalog rows and gateway methods do not exist.

- [ ] **Step 3: Add the minimal typed contracts**

Use these stable shapes:

```ts
export type TerminalStatus = "starting" | "running" | "succeeded" | "failed" | "exited"
export type ManagedOperationId =
  | `app.${DesktopAppId}.web`
  | "app.seumei.native.build"
  | "app.seumei.native.install"
  | "app.seumei.native.start"
  | `gate.${GateId}`

export interface TerminalSession {
  readonly id: string
  readonly title: string
  readonly kind: "shell" | "managed"
  readonly status: TerminalStatus
  readonly cwd: string
  readonly exitCode?: number
  readonly tail: string
}

export interface TerminalChunk {
  readonly sessionId: string
  readonly sequence: number
  readonly data: string
}

export interface NativeAppRuntime {
  readonly appId: "seumei"
  readonly state: "not-built" | "built" | "installed" | "running"
  readonly version?: string
}
```

Gateway methods are `createTerminal`, `writeTerminal`, `resizeTerminal`, `interruptTerminal`, `closeTerminal`, `listTerminals`, `subscribeTerminal`, `startManagedOperation` and `getNativeAppRuntime`. Subscription receives a `Channel<TerminalChunk | TerminalSession>` supplied by the integration adapter; UI never sees Tauri's channel type.

- [ ] **Step 4: Run tests, typecheck and lint to GREEN**

```powershell
corepack pnpm --filter @matriz/app-matriz-desktop test
corepack pnpm --filter @matriz/app-matriz-desktop typecheck
corepack pnpm --filter @matriz/app-matriz-desktop lint
```

- [ ] **Step 5: Commit the contract**

```powershell
git add apps/matriz-desktop/src
git commit -m "feat(desktop): define native terminal contracts"
```

### Task 2: Implement the bounded ConPTY session manager

**Files:**
- Modify: `apps/matriz-desktop/src-tauri/Cargo.toml`
- Modify: `apps/matriz-desktop/src-tauri/Cargo.lock`
- Create: `apps/matriz-desktop/src-tauri/src/terminal.rs`
- Create: `apps/matriz-desktop/src-tauri/tests/terminal.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`

**Interfaces:**
- Produces: `TerminalManager::{create_shell,start_managed,list,write,resize,interrupt,close,subscribe,shutdown}`.
- Consumes: validated workspace root, backend catalog resolution and `tauri::ipc::Channel<TerminalEvent>`.

- [ ] **Step 1: Write Rust tests for the security and lifecycle boundary**

Use a fake `PtyFactory` and literal events to prove: seventh session is rejected; unknown IDs cannot be written/resized/closed; dimensions normalize to `2..=400` columns and `1..=200` rows; output chunks cap at 64 KiB; retained tails cap at 256 KiB; close removes a session; shutdown terminates all children; server-generated IDs are unique and ignore renderer data.

- [ ] **Step 2: Run the new Rust target and witness RED**

```powershell
cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --test terminal
```

Expected: compile failure because `terminal` and its public test seam do not exist.

- [ ] **Step 3: Implement the minimal manager with `portable-pty = "0.9.0"`**

Create a focused module with:

```rust
const MAX_SESSIONS: usize = 6;
const MAX_CHUNK_BYTES: usize = 64 * 1024;
const MAX_TAIL_BYTES: usize = 256 * 1024;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum TerminalEvent {
    Output { session_id: String, sequence: u64, data: String },
    State { session: TerminalSession },
}
```

Select `pwsh.exe` only when discoverable through `where.exe`; otherwise use the fixed `powershell.exe` executable. Open ConPTY at 100×30, set the validated workspace as cwd, clone the reader onto a dedicated thread, retain a bounded UTF-8-lossy tail, and send ordered chunks to the subscribed channel. Store writer, master PTY and child behind focused synchronized handles. Do not construct a `-Command` string for interactive shells.

- [ ] **Step 4: Register typed Tauri commands**

Commands accept only session IDs, bounded data, dimensions, or a managed-operation ID. `subscribe_terminal` accepts a top-level `Channel<TerminalEvent>`. The `RunEvent::ExitRequested` path invokes manager shutdown before exit.

- [ ] **Step 5: Run Rust tests and Clippy to GREEN**

```powershell
cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml
cargo clippy --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --all-targets -- -D warnings
```

- [ ] **Step 6: Commit the manager**

```powershell
git add apps/matriz-desktop/src-tauri
git commit -m "feat(desktop): host bounded powershell sessions"
```

### Task 3: Build the terminal workspace and persistent responsive dock

**Files:**
- Modify: `apps/matriz-desktop/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/matriz-desktop/src/ui/terminal/terminal-store.ts`
- Create: `apps/matriz-desktop/src/ui/terminal/terminal-store.test.ts`
- Create: `apps/matriz-desktop/src/ui/terminal/terminal-view.tsx`
- Create: `apps/matriz-desktop/src/ui/terminal/terminal-view.test.tsx`
- Create: `apps/matriz-desktop/src/ui/terminal/terminal-pane.tsx`
- Create: `apps/matriz-desktop/src/ui/terminal/use-terminal-runtime.ts`
- Modify: `apps/matriz-desktop/src/ui/app.tsx`
- Modify: `apps/matriz-desktop/src/ui/app.test.tsx`
- Modify: `apps/matriz-desktop/src/ui/styles.css`
- Modify: `apps/matriz-desktop/src/ui/icons.tsx`

**Interfaces:**
- Consumes: Task 1 gateway and session contracts.
- Produces: a six-tab terminal surface, `TerminalDockState`, persistent activity indicator and responsive dock/full-view composition.

- [ ] **Step 1: Add xterm dependencies**

```powershell
corepack pnpm --filter @matriz/app-matriz-desktop add @xterm/xterm@6.0.0 @xterm/addon-fit@0.11.0
```

- [ ] **Step 2: Write reducer tests and witness RED**

Tests use literal session/chunk fixtures and prove ordered append, stale-sequence rejection, active-tab fallback after close, status persistence while dock is hidden, and six-tab UI disablement. Run the focused test before adding the reducer.

- [ ] **Step 3: Implement the terminal store and runtime hook**

One subscription is established per mounted Control app. Reconcile backend session snapshots before accepting chunks. Never append terminal output to React string state; route chunks directly to the xterm instance registered for the session while the store retains metadata only.

- [ ] **Step 4: Write terminal component tests and witness RED**

Use a lightweight fake terminal adapter at the renderer boundary, not a fake React component. Prove plus/tab/close/interrupt behavior, accessible labels, active status, dock collapse, and terminal count in navigation.

- [ ] **Step 5: Implement the xterm pane and responsive composition**

Load the official xterm CSS and fit addon. Configure Matriz colors, 13 px monospace, 1000-line scrollback, cursor bar, screen-reader mode and minimum contrast. Resize through `ResizeObserver` with animation-frame coalescing. The shell grid uses bottom dock below 760 px, normal dock from 760–1099 px and a resizable right rail from 1100 px. Full Terminal mode always fills the working surface.

- [ ] **Step 6: Verify UI GREEN**

```powershell
corepack pnpm --filter @matriz/app-matriz-desktop test
corepack pnpm --filter @matriz/app-matriz-desktop typecheck
corepack pnpm --filter @matriz/app-matriz-desktop lint
corepack pnpm --filter @matriz/app-matriz-desktop build
```

- [ ] **Step 7: Commit the workspace**

```powershell
git add apps/matriz-desktop pnpm-lock.yaml
git commit -m "feat(desktop): add multi-tab terminal workspace"
```

### Task 4: Route managed apps and gates through observable sessions

**Files:**
- Modify: `apps/matriz-desktop/src-tauri/src/catalog.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/workspace.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/tasks.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/terminal.rs`
- Modify: `apps/matriz-desktop/src-tauri/tests/catalog.rs`
- Create: `apps/matriz-desktop/src-tauri/tests/managed_operations.rs`
- Modify: `apps/matriz-desktop/src/domain/types.ts`
- Modify: `apps/matriz-desktop/src/ui/app.tsx`
- Modify: `apps/matriz-desktop/src/ui/app.test.tsx`

**Interfaces:**
- Produces: exact Rust `ManagedOperationDefinition { id, program, args, cwd, title }` resolution and real-time runtime transitions.
- Consumes: Task 2 terminal manager and the fixed package/app catalog.

- [ ] **Step 1: Write failing catalog authorization tests**

Table-test every allowed ID and reject `pnpm arbitrary`, path traversal, an unknown app and a renderer-supplied argument. Test state transitions `queued → starting → ready|failed|exited` from controlled fake child/readiness signals.

- [ ] **Step 2: Witness RED, then implement exact operation resolution**

For web apps resolve `pnpm.cmd --filter <known package> dev`. For gates resolve `pnpm.cmd run <known script>`. For Seumei native build resolve `pnpm.cmd --filter @matriz/app-seumei package:desktop`. Arguments are stored as `OsString` arrays, never joined into a shell command.

- [ ] **Step 3: Replace hidden app/gate execution with managed terminal sessions**

Keep existing method names as compatibility adapters where useful, but every user-triggered start/gate returns or focuses a terminal session. Readiness still comes from listener enumeration, not output parsing. Stop sends interrupt first and uses the existing observed-process termination boundary for a listener-owned inherited process.

- [ ] **Step 4: Add frontend behavior tests and implementation**

Prove that starting Seumei Web creates/focuses `SEUMEI / WEB`, an active operation remains visible in the rail after leaving Apps, and a failed operation exposes a non-color status label. Implement the minimum UI changes.

- [ ] **Step 5: Run scoped validation and commit**

```powershell
cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml
cargo clippy --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --all-targets -- -D warnings
corepack pnpm --filter @matriz/app-matriz-desktop test
corepack pnpm --filter @matriz/app-matriz-desktop typecheck
corepack pnpm --filter @matriz/app-matriz-desktop lint
git add apps/matriz-desktop
git commit -m "feat(desktop): expose managed operations in terminal"
```

### Task 5: Implement the Matriz Command Deck bonus

**Files:**
- Create: `apps/matriz-desktop/src/application/command-deck.ts`
- Create: `apps/matriz-desktop/src/application/command-deck.test.ts`
- Create: `apps/matriz-desktop/src/ui/command-deck/command-deck.tsx`
- Create: `apps/matriz-desktop/src/ui/command-deck/command-deck.test.tsx`
- Modify: `apps/matriz-desktop/src/ui/app.tsx`
- Modify: `apps/matriz-desktop/src/ui/styles.css`

**Interfaces:**
- Produces: `buildCommandIndex(context)`, `rankCommands(query, commands, recentIds)` and an accessible `CommandDeck` dialog.
- Consumes: current app runtimes, terminal sessions, observed ports, gates and quick targets.

- [ ] **Step 1: Write failing ranking tests**

Literal cases prove accent-insensitive token ranking (`seu nat`), prefix before substring, live state inclusion, recent-success tiebreaking, empty-query defaults and no arbitrary result creation.

- [ ] **Step 2: Witness RED and implement the pure index/ranker**

Normalize with `NFD` and strip combining marks. Keep deterministic integer scoring and stable catalog order. Recent IDs are kept in a bounded local list of ten; failed/cancelled actions do not rank up.

- [ ] **Step 3: Write failing interaction tests**

Prove `Ctrl+K` open/close, focus restoration, arrow navigation, Enter execution, second confirmation for kill actions, Escape cancellation and status labels readable without color.

- [ ] **Step 4: Implement the deck and verify GREEN**

Use one modal plane, no card grid, no freeform execution and the existing gateway actions. Results show icon, label, terse context, live status and key hint. Add semantic sound only for open/navigation/success/error.

- [ ] **Step 5: Run scoped checks and commit**

```powershell
corepack pnpm --filter @matriz/app-matriz-desktop test
corepack pnpm --filter @matriz/app-matriz-desktop typecheck
corepack pnpm --filter @matriz/app-matriz-desktop lint
git add apps/matriz-desktop/src
git commit -m "feat(desktop): add global command deck"
```

### Task 6: Create portable Seumei product view models and local desktop composition

**Files:**
- Create: `apps/seumei/src/application/create-seumei-container.ts`
- Create: `apps/seumei/src/application/create-seumei-container.test.ts`
- Modify: `apps/seumei/src/lib/container.ts`
- Create: `apps/seumei/src/ui/product/product-model.ts`
- Create: `apps/seumei/src/ui/product/product-model.test.ts`
- Create: `apps/seumei/src/ui/product/DashboardView.tsx`
- Create: `apps/seumei/src/ui/product/EstablishmentsView.tsx`
- Create: `apps/seumei/src/ui/product/OwnersView.tsx`
- Create: `apps/seumei/desktop/src/local-session.ts`
- Create: `apps/seumei/desktop/src/local-session.test.ts`
- Create: `apps/seumei/desktop/src/app.tsx`
- Create: `apps/seumei/desktop/src/app.test.tsx`
- Create: `apps/seumei/desktop/src/styles.css`
- Create: `apps/seumei/desktop/src/main.tsx`

**Interfaces:**
- Produces: storage-injected Seumei container, portable page view models and native shell routes `dashboard|establishments|owners|settings`.
- Consumes: existing repositories, use cases, presenters, MatrizLib public exports and namespaced platform storage.

- [ ] **Step 1: Write failing container tests**

Prove that injecting the same namespaced store persists an establishment update across two container instances while different namespaces remain isolated. The test should fail because the current cached container always creates memory storage.

- [ ] **Step 2: Implement storage injection without changing web behavior**

Add `createSeumeiContainer(store, contractsGateway?)`; keep `getSeumeiContainer()` as the existing cached in-memory web adapter. No package or domain move occurs.

- [ ] **Step 3: Write failing product-model tests**

Hand-derive dashboard counts and owner/establishment view models for the Matriz tenant. Ensure portable components receive only these models and action callbacks.

- [ ] **Step 4: Implement product views and local session**

Local session contains only a generated local profile ID, display name and selected tenant ID in `seumei:desktop:session:v1`; it is explicitly labelled `LOCAL`. Use `createNamespacedStore(createLocalStorageStore(), "seumei-desktop:v1")` for repositories. Settings cover theme, sounds and reset-local-data only.

- [ ] **Step 5: Write native composition tests and witness RED**

Test direct navigation among all four surfaces, local badge, seeded records, persistence after remount, reset confirmation, keyboard focus and no dependency on Hub fetches.

- [ ] **Step 6: Implement the restrained Seumei native UI and verify GREEN**

Use a native left rail, wide working canvas, dense list rows, minimal copy and a responsive compact rail. Integrate Seumei themes/tokens and MatrizLib sounds. No Next imports are allowed below `desktop/`.

- [ ] **Step 7: Run Seumei tests/typecheck/lint and commit**

```powershell
corepack pnpm --filter @matriz/app-seumei test
corepack pnpm --filter @matriz/app-seumei typecheck
corepack pnpm --filter @matriz/app-seumei lint
git add apps/seumei/src apps/seumei/desktop
git commit -m "feat(seumei): add portable native product surface"
```

### Task 7: Package standalone Seumei Desktop and integrate its lifecycle in Control

**Files:**
- Create: `apps/seumei/desktop/index.html`
- Create: `apps/seumei/desktop/vite.config.ts`
- Create: `apps/seumei/desktop/tsconfig.json`
- Create: `apps/seumei/desktop/src-tauri/Cargo.toml`
- Create: `apps/seumei/desktop/src-tauri/Cargo.lock`
- Create: `apps/seumei/desktop/src-tauri/build.rs`
- Create: `apps/seumei/desktop/src-tauri/src/main.rs`
- Create: `apps/seumei/desktop/src-tauri/src/lib.rs`
- Create: `apps/seumei/desktop/src-tauri/tauri.conf.json`
- Create: `apps/seumei/desktop/src-tauri/capabilities/main.json`
- Create: `apps/seumei/desktop/src-tauri/icons/*`
- Modify: `apps/seumei/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/matriz-desktop/src-tauri/src/native_apps.rs`
- Create: `apps/matriz-desktop/src-tauri/tests/native_apps.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Modify: `apps/matriz-desktop/src/ui/app.tsx`
- Modify: `apps/matriz-desktop/src/ui/app.test.tsx`

**Interfaces:**
- Produces: `Seumei_0.1.0_x64-setup.exe`, installed executable discovery and `WEB | NATIVO` UI flow.
- Consumes: Task 6 renderer and Task 4 managed operation catalog.

- [ ] **Step 1: Add generated/configuration shell files**

Use identifier `com.matriz.seumei`, product `Seumei`, current-user NSIS, Windows x64, WebView2 download bootstrapper, undecorated resizable window at 1180×760 with minimum 760×560, strict CSP and no shell capability. Rust owns window close/minimize only; the Seumei renderer has no generic OS commands.

- [ ] **Step 2: Write failing native-state tests**

Use temporary filesystem fixtures to prove precedence `running > installed > built > not-built`, exact expected artifact filename, canonical workspace containment and rejection of same-name executables outside registered install/workspace paths.

- [ ] **Step 3: Implement native discovery and fixed launch/install operations**

Discover current-user installation through the expected `%LOCALAPPDATA%` product path and uninstall registry metadata; canonicalize a built installer only under `apps/seumei/desktop/src-tauri/target/release/bundle/nsis`. Launch installed executable directly. Launch the installer non-elevated and never wait for audio or UI completion.

- [ ] **Step 4: Write and implement Control mode-selector behavior**

Test Web start, Native start, Built install and Not-built generate states. Preserve visible terminal state for generate operations. The selector is keyboard-operable and never displays `BAIXAR` while no release provider exists.

- [ ] **Step 5: Build both native products**

```powershell
corepack pnpm --filter @matriz/app-seumei build:desktop
corepack pnpm --filter @matriz/app-seumei package:desktop
corepack pnpm --filter @matriz/app-matriz-desktop package
```

- [ ] **Step 6: Install and validate Seumei independently**

Install silently for the current user, launch without Hub/Node processes, verify its real window and local persistence, close, reopen, uninstall silently, then prove installation directory and uninstall registry entry are removed. Record startup time and working set without committing logs.

- [ ] **Step 7: Validate the Control-driven lifecycle**

From a clean Seumei-uninstalled state: generate installer in a managed terminal, install through the Apps surface, launch the installed app, observe `running`, close it and observe `installed`. No renderer-provided path enters native commands.

- [ ] **Step 8: Run scoped checks and commit**

```powershell
cargo test --manifest-path apps/seumei/desktop/src-tauri/Cargo.toml
cargo clippy --manifest-path apps/seumei/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml
corepack pnpm --filter @matriz/app-seumei test
corepack pnpm --filter @matriz/app-seumei typecheck
corepack pnpm --filter @matriz/app-seumei lint
corepack pnpm --filter @matriz/app-matriz-desktop test
git add apps/seumei apps/matriz-desktop pnpm-lock.yaml
git commit -m "feat(seumei): ship standalone Windows application"
```

### Task 8: Complete documentation, CI, browser/native verification and repository gates

**Files:**
- Modify: `apps/matriz-desktop/README.md`
- Modify: `apps/matriz-desktop/AGENTS.md`
- Modify: `apps/matriz-desktop/docs/AGENT-START-HERE.md`
- Modify: `apps/seumei/README.md`
- Modify: `apps/seumei/AGENTS.md`
- Modify: `apps/seumei/docs/AGENT-START-HERE.md`
- Modify: `docs/DECISION-LOG.md`
- Modify: `docs/monorepo-structure.md`
- Modify: `docs/app-ownership-map.md`
- Modify: `.github/workflows/matriz-desktop.yml`
- Create: `.github/workflows/seumei-desktop.yml`

**Interfaces:**
- Produces: concise next-agent operational docs and two independent Windows installer workflows.
- Consumes: all prior tasks and repository safety gates.

- [ ] **Step 1: Document only operational and architectural facts**

Record commands, terminal security boundary, session limits, responsive behavior, Seumei local mode, installer locations, current unsigned limitation, how to add a managed operation and why native code remains app-local. Update the decision log and ownership map without declaring Seumei Desktop a new domain app.

- [ ] **Step 2: Add Windows CI packaging**

Pin Node 22 and pnpm 9.12 through Corepack. Run scoped frontend/Rust checks and upload independently named NSIS artifacts for Control and Seumei. Do not publish a release or download URL.

- [ ] **Step 3: Run browser renderer verification**

Verify Control at 420×560, 760×700 and 1440×900; verify Seumei at 760×560, 1180×760 and 1920×1080. Check no document overflow, terminal side/dock/full layouts, Command Deck keyboard flow, focus outlines, reduced motion, clean console and semantic status. Screenshots remain ignored.

- [ ] **Step 4: Run real-terminal acceptance**

In the packaged Control execute `$PSVersionTable.PSVersion`, `Get-Location` and a Unicode echo in two tabs; resize both; change views; hide/show; interrupt a long-running ping; close sessions. Start Seumei Web and verify port 3002 plus visible logs. Confirm no orphaned terminal child remains after Control exit.

- [ ] **Step 5: Run the complete gate loop**

With process-scoped dummy PostgreSQL URLs only when the isolated worktree lacks environment values:

```powershell
corepack pnpm run build
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run test:smoke
corepack pnpm run prisma:validate
cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml
cargo clippy --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path apps/seumei/desktop/src-tauri/Cargo.toml
cargo clippy --manifest-path apps/seumei/desktop/src-tauri/Cargo.toml --all-targets -- -D warnings
corepack pnpm exec tsx tooling/scripts/verify-app-boundaries.ts
git diff --check
```

Repeat until the complete sequence exits zero on the final commit candidate.

- [ ] **Step 6: Audit and commit**

Scan tracked files for `.env`, logs, installers, `target`, `dist`, `.next`, terminal history, secrets, direct cross-app internal imports and direct `new Audio`. Commit documentation/CI with:

```powershell
git add .github apps/matriz-desktop apps/seumei docs
git commit -m "docs(native): document terminal and seumei distribution"
```

- [ ] **Step 7: Integrate and publish without touching main**

Fetch `origin`, merge `origin/main` only if it is not already an ancestor, repeat the full gate loop after any merge, push `codex/matriz-desktop`, and verify upstream divergence is `0 0` with a clean worktree.

