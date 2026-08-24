# Matriz Control Operational Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect managed app execution, endpoints, routes, contextual actions, one native preview and compact activity into a single safe operational runtime.

**Architecture:** Rust remains the authority for runtime ownership, loopback URL construction, preview lifecycle and activity transport. React builds view models from typed snapshots, resolves actions through one application registry and renders Apps, Quick Actions, Command Deck, Preview and operational presence as consumers of the same model. All implementation remains app-local.

**Tech Stack:** Tauri 2.11.5, Rust 2021, WebView2/Wry, React 19, TypeScript 5.6, Vite 5, Vitest 2, Testing Library, WebdriverIO.

**Spec:** `docs/superpowers/specs/2026-08-24-matriz-control-operational-runtime-design.md`

## Global Constraints

- Change only `apps/matriz-desktop` plus its app-local docs and acceptance selectors.
- Never expose arbitrary URLs, executables, arguments, filesystem paths or process names to automated actions.
- Never import another app's `src/**` or `app/**`; route metadata may come only from `@apps/<app>/public-contract`.
- External listeners remain protected from stop/restart.
- Maintain at most one child preview webview and dispose it when Preview closes.
- Keep activity in memory, bounded to 200 envelopes, without terminal output or secrets.
- Do not touch the pre-existing Spot and Willdash `next-env.d.ts` changes.

---

## File map

- `src-tauri/src/runtime.rs` — runtime snapshot composition and route/URL validation.
- `src-tauri/src/activity.rs` — bounded native activity hub and Tauri channel fan-out.
- `src-tauri/src/preview.rs` — single child-WebView2 lifecycle and navigation policy.
- `src/application/app-manifests.ts` — allowed public-contract route metadata.
- `src/application/action-registry.ts` — contextual action descriptors and execution.
- `src/ui/runtime/use-runtime.ts` — snapshot refresh and selection controller.
- `src/ui/runtime/quick-actions.tsx` — registry-driven compact action surface.
- `src/ui/runtime/route-picker.tsx` — declared and validated manual route choice.
- `src/ui/preview/preview-view.tsx` — native preview controls and bounds bridge.
- `src/ui/activity/use-activity.ts` — native activity subscription and reducer.
- `src/ui/activity/operational-presence.tsx` — compact status/activity rail.
- `src/ui/app.tsx` — shell composition only; extract the existing Apps implementation.

### Task 1: Establish the authoritative runtime snapshot

**Files:**
- Create: `apps/matriz-desktop/src-tauri/src/runtime.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/catalog.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/terminal.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Modify: `apps/matriz-desktop/src/domain/types.ts`
- Modify: `apps/matriz-desktop/src/application/desktop-gateway.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/command-contract.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/tauri-gateway.ts`
- Test: `apps/matriz-desktop/src-tauri/tests/runtime.rs`
- Test: `apps/matriz-desktop/src/integration/tauri/tauri-gateway.test.ts`

**Interfaces:**
- Produces Rust `RuntimeSnapshot { generated_at, apps: Vec<RuntimeInstance> }`.
- Produces TypeScript `RuntimeInstance` with `id`, `label`, `port`, `status`, `ownership`, `pid`, `sessionId`, `endpoint` and `health`.
- Produces `DesktopGateway.runtimeSnapshot(): Promise<RuntimeSnapshot>`.

- [ ] **Step 1: Write failing Rust tests** for valid loopback URL construction, rejection of schemes/backslashes/control characters/parent traversal/oversized paths, and managed-versus-external ownership mapping.
- [ ] **Step 2: Run `cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --test runtime`** and confirm missing runtime APIs cause failure.
- [ ] **Step 3: Implement minimal runtime composition** from the Rust app catalog, listener inventory and terminal managed-session summaries. Keep `OperationsState::app_statuses` compatible until React migrates.
- [ ] **Step 4: Add the typed `get_runtime_snapshot` command and gateway mapping**, then extend the gateway test with a complete literal snapshot fixture.
- [ ] **Step 5: Run the focused Rust and TypeScript tests** and commit `feat(desktop): model operational runtimes`.

### Task 2: Declare routes and build one contextual action registry

**Files:**
- Create: `apps/matriz-desktop/src/application/app-manifests.ts`
- Create: `apps/matriz-desktop/src/application/action-registry.ts`
- Create: `apps/matriz-desktop/src/application/action-registry.test.ts`
- Modify: `apps/matriz-desktop/src/application/catalog.ts`
- Modify: `apps/matriz-desktop/src/application/command-deck.ts`
- Modify: `apps/matriz-desktop/src/application/desktop-gateway.ts`
- Modify: `apps/matriz-desktop/src/domain/types.ts`

**Interfaces:**
- Consumes `RuntimeInstance` from Task 1.
- Produces `RuntimeTarget { appId, routePath }` and `ActionContext { runtime, activeRoute, terminalSessionId?, previewOpen }`.
- Produces `ContextualAction { id, label, group, risk, isAvailable(context), execute(context, services) }`.
- Produces `getRuntimeActions(context)` and `getDeckCommands(contexts)`.

- [ ] **Step 1: Write failing registry tests** proving stopped, managed-ready and external-ready runtimes receive different action sets; all nine route lists originate from public manifests; and three surfaces receive the same stable action IDs.
- [ ] **Step 2: Run the focused Vitest file** and verify imports/functions are missing.
- [ ] **Step 3: Implement public-contract route mapping** using only `@apps/*/public-contract` exports and normalize dynamic manifest paths as visible declared routes without pretending they are directly openable.
- [ ] **Step 4: Implement the action registry** with semantic service methods for external open, preview, route selection, URL copy, restart, stop and terminal focus. Keep clipboard execution injected and URL-limited.
- [ ] **Step 5: Adapt Command Deck generation** to consume registry descriptors while preserving destructive confirmation.
- [ ] **Step 6: Run registry, command-deck and boundary lint tests** and commit `feat(desktop): register contextual runtime actions`.

### Task 3: Add allowlisted external open, route invocation and restart

**Files:**
- Modify: `apps/matriz-desktop/src-tauri/src/runtime.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/command_contract.rs`
- Modify: `apps/matriz-desktop/src/application/desktop-gateway.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/command-contract.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/tauri-gateway.ts`
- Test: `apps/matriz-desktop/src-tauri/tests/authorization.rs`
- Test: `apps/matriz-desktop/src-tauri/tests/command_contract.rs`
- Test: `apps/matriz-desktop/src/integration/tauri/command-contract.test.ts`

**Interfaces:**
- Produces `open_runtime_target(app_id, route_path)` with Rust URL construction.
- Produces `restart_runtime(app_id)` restricted to Control-owned managed sessions.
- Produces `DesktopGateway.openRuntimeTarget(target)` and `restartRuntime(appId)`.

- [ ] **Step 1: Add failing authorization tests** for arbitrary host/scheme rejection, unknown app rejection and external runtime restart rejection.
- [ ] **Step 2: Run focused Rust tests** and confirm the commands do not exist.
- [ ] **Step 3: Implement exact commands** that accept app IDs and validated local paths only. Open externally through the Windows shell after Rust constructs the loopback URL.
- [ ] **Step 4: Implement restart as close-owned-session then start-known-operation**, returning the updated runtime snapshot; do not kill a listener by port.
- [ ] **Step 5: Update both command inventories and gateway tests**, run them, and commit `feat(desktop): execute bounded runtime actions`.

### Task 4: Host one native WebView2 preview

**Files:**
- Create: `apps/matriz-desktop/src-tauri/src/preview.rs`
- Create: `apps/matriz-desktop/src-tauri/tests/preview.rs`
- Modify: `apps/matriz-desktop/src-tauri/Cargo.toml`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/command_contract.rs`
- Modify: `apps/matriz-desktop/src/domain/types.ts`
- Modify: `apps/matriz-desktop/src/application/desktop-gateway.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/command-contract.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/tauri-gateway.ts`

**Interfaces:**
- Consumes validated `RuntimeTarget` from Task 3.
- Produces `PreviewState { appId, route, url, status, canGoBack, canGoForward, error? }`.
- Produces gateway methods `openPreview`, `setPreviewBounds`, `navigatePreview`, `previewBack`, `previewForward`, `reloadPreview`, `closePreview`, `subscribePreview`.

- [ ] **Step 1: Write failing pure Rust tests** for same-origin navigation, loopback host/port enforcement, one-active-preview replacement and close-idempotence through an injected preview driver.
- [ ] **Step 2: Run the preview test** and confirm the module is missing.
- [ ] **Step 3: Implement `PreviewManager<D>` state and policy** independent of Tauri, then make tests green.
- [ ] **Step 4: Add the Tauri child-webview driver** with the pinned `unstable` feature, async creation, popup/download rejection, page-load notifications, logical bounds, history evaluation, reload and close.
- [ ] **Step 5: Register typed commands and frontend transport**, run Rust command-contract and gateway tests, and commit `feat(desktop): add single native app preview`.

### Task 5: Add the bounded activity backbone

**Files:**
- Create: `apps/matriz-desktop/src-tauri/src/activity.rs`
- Create: `apps/matriz-desktop/src-tauri/tests/activity.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/terminal.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Modify: `apps/matriz-desktop/src/domain/types.ts`
- Modify: `apps/matriz-desktop/src/application/desktop-gateway.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/command-contract.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/tauri-gateway.ts`

**Interfaces:**
- Produces `ActivityEnvelope` and clonable `ActivityHub` with `publish`, `history` and `subscribe`.
- Produces `DesktopGateway.activityHistory()` and `subscribeActivity(listener)`.

- [ ] **Step 1: Write failing Rust tests** for 200-event eviction, order, safe summary length and absence of raw terminal output fields.
- [ ] **Step 2: Run the activity test** and verify the module is missing.
- [ ] **Step 3: Implement the hub and channel fan-out** with monotonically ordered UUID/timestamp envelopes.
- [ ] **Step 4: Inject the hub into TerminalManager, runtime actions and PreviewManager** and publish only lifecycle/status summaries.
- [ ] **Step 5: Register history/subscription commands**, update transport tests, run them, and commit `feat(desktop): publish bounded operational activity`.

### Task 6: Compose Apps, Quick Actions, Preview and operational presence

**Files:**
- Create: `apps/matriz-desktop/src/ui/runtime/use-runtime.ts`
- Create: `apps/matriz-desktop/src/ui/runtime/use-runtime.test.tsx`
- Create: `apps/matriz-desktop/src/ui/runtime/apps-view.tsx`
- Create: `apps/matriz-desktop/src/ui/runtime/quick-actions.tsx`
- Create: `apps/matriz-desktop/src/ui/runtime/route-picker.tsx`
- Create: `apps/matriz-desktop/src/ui/preview/preview-view.tsx`
- Create: `apps/matriz-desktop/src/ui/preview/preview-view.test.tsx`
- Create: `apps/matriz-desktop/src/ui/activity/use-activity.ts`
- Create: `apps/matriz-desktop/src/ui/activity/operational-presence.tsx`
- Create: `apps/matriz-desktop/src/ui/activity/operational-presence.test.tsx`
- Modify: `apps/matriz-desktop/src/ui/app.tsx`
- Modify: `apps/matriz-desktop/src/ui/app.test.tsx`
- Modify: `apps/matriz-desktop/src/ui/styles.css`
- Modify: `apps/matriz-desktop/src/integration/unavailable-gateway.ts`

**Interfaces:**
- Consumes Tasks 1–5 only through domain types, registry and DesktopGateway.
- Produces the complete P0/P1 user flow and stable accessible selectors for acceptance.

- [ ] **Step 1: Read the frontend design skill and current stylesheet completely** before visual changes.
- [ ] **Step 2: Write failing component tests** for selected runtime, shared Quick Actions, declared/manual route, preview controls/bounds cleanup and five-entry operational presence.
- [ ] **Step 3: Extract Apps from the monolithic shell** without changing behavior, then make runtime selection and responsive two-pane composition work.
- [ ] **Step 4: Render registry-driven actions and route picker** with compact disclosure; preserve keyboard navigation and explicit disabled reasons.
- [ ] **Step 5: Render the native preview host rectangle** and synchronize it with ResizeObserver; always close the child webview on unmount or view change.
- [ ] **Step 6: Render operational presence as status/activity only** with no prompt box; connect action results to existing sound feedback.
- [ ] **Step 7: Adapt Command Deck to the selected runtime contexts**, run all frontend tests/typecheck/lint, and commit `feat(desktop): unify runtime operational surfaces`.

### Task 7: Diagnose the pre-existing ConPTY failure and verify the release story

**Files:**
- Modify only if root cause is proven: `apps/matriz-desktop/src-tauri/src/terminal.rs`
- Modify only if root cause is proven: `apps/matriz-desktop/src-tauri/tests/terminal.rs`
- Modify: `apps/matriz-desktop/acceptance/e2e/apps.e2e.ts`
- Create: `apps/matriz-desktop/acceptance/e2e/preview.e2e.ts`
- Modify: `apps/matriz-desktop/docs/ACCEPTANCE.md`
- Modify: `apps/matriz-desktop/README.md`
- Modify: `docs/DECISION-LOG.md`

**Interfaces:**
- Consumes the completed user flow.
- Produces scoped validation evidence and an explicit diagnosis of the baseline test.

- [ ] **Step 1: Instrument the ConPTY test boundary without changing production behavior** to establish whether immediate input precedes shell readiness, input is lost, or the reader thread fails.
- [ ] **Step 2: Form and test one hypothesis at a time**; if root cause is confirmed, write a failing regression test before the single fix. Do not merely increase five seconds.
- [ ] **Step 3: Add WebdriverIO coverage** for managed runtime selection, external open contract, route choice, preview create/navigate/reload/close and external-listener protection.
- [ ] **Step 4: Run `test`, `typecheck`, `lint`, Rust format/check/test and Clippy** for the desktop app.
- [ ] **Step 5: Run the packaged Windows app or production binary**, inspect 760x700 and 1440x900, keyboard flow, console/runtime errors, memory before/after preview, and child-webview disposal.
- [ ] **Step 6: Capture intentional screenshots outside tracked source**, update docs/decision log with measured lifecycle and deferred integrations, and commit `test(desktop): certify operational runtime surfaces`.
- [ ] **Step 7: Run `pnpm --filter @matriz/app-matriz-desktop package` only after all scoped checks pass**; report any unavailable installed acceptance separately rather than weakening it.
