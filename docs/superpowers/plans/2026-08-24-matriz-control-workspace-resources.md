# Matriz Control Workspace Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure, functional Environment Manager and Files & Assets Explorer surfaces to Matriz Control.

**Architecture:** An app-local Rust `WorkspaceResourceService` resolves catalog app IDs to canonical workspace paths and owns all filesystem authority. Typed Tauri commands expose bounded environment and explorer view models; React composes them with the existing runtime, Action Registry and ActivityHub.

**Tech Stack:** Tauri 2, Rust 2021, React 19, TypeScript, Vitest, Rust unit/integration tests, MatrizLib public primitives.

**Spec:** `docs/superpowers/specs/2026-08-24-matriz-control-workspace-resources-design.md`

## Global Constraints

- Work only in `apps/matriz-desktop` plus the decision log and this plan.
- Never accept an absolute filesystem path or executable argument from React.
- Never return sensitive environment values from list/read commands.
- Never publish environment values to ActivityHub.
- Permanent delete is forbidden; deletion must use the Windows Recycle Bin.
- Existing external-runtime ownership protection remains unchanged.
- Keep `apps/spot/next-env.d.ts` and `apps/willdash/next-env.d.ts` untouched.

---

### Task 1: Catalog app roots and safe resource resolution

**Files:**
- Modify: `apps/matriz-desktop/src-tauri/src/catalog.rs`
- Create: `apps/matriz-desktop/src-tauri/src/resources.rs`
- Create: `apps/matriz-desktop/src-tauri/tests/resources.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`

**Interfaces:**
- Produces: `WorkspaceResourceService::new(root: PathBuf)`, `app_root(app_id)`, `existing_path(app_id, relative_path)` and `new_child_path(app_id, parent, name)`.
- Consumes: `catalog::app_definition` and `OperationsState::root`.

- [ ] **Step 1: Write failing path-boundary tests**

```rust
#[test]
fn resolves_only_catalog_apps_inside_the_workspace() {
    let service = fixture_service();
    assert!(service.existing_path("matriz-admin", "src").is_ok());
    assert!(service.existing_path("unknown", "src").is_err());
    assert!(service.existing_path("matriz-admin", "../spot").is_err());
}
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --test resources`
Expected: compilation failure because `WorkspaceResourceService` does not exist.

- [ ] **Step 3: Add catalog directories and the minimal resolver**

Add a static `directory` field to each `AppDefinition`. Canonicalize the workspace and app root, require existing targets to start with the canonical app root, reject absolute input and components other than normal/current directory, and require safe single child names for new targets.

- [ ] **Step 4: Run resource and catalog tests**

Run: `cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --test resources --test catalog`
Expected: PASS.

- [ ] **Step 5: Commit the boundary**

```powershell
git add apps/matriz-desktop/src-tauri
git commit -m "feat(desktop): add workspace resource boundary"
```

### Task 2: Environment parser and atomic store

**Files:**
- Create: `apps/matriz-desktop/src-tauri/src/environment.rs`
- Create: `apps/matriz-desktop/src-tauri/tests/environment.rs`
- Modify: `apps/matriz-desktop/src-tauri/Cargo.toml`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`

**Interfaces:**
- Produces: `EnvironmentService::{list, read, reveal, save}`, `EnvironmentDocument`, `EnvironmentVariable`, `EnvironmentSaveRequest`.
- Consumes: `WorkspaceResourceService`.

- [ ] **Step 1: Write failing behavior tests**

```rust
#[test]
fn read_masks_secrets_and_round_trips_comments() {
    let service = fixture_environment("# keep\nPUBLIC_URL=http://localhost\nJWT_SECRET=secret\n");
    let document = service.read("matriz-admin", ".env.local").unwrap();
    assert_eq!(document.variables[0].value.as_deref(), Some("http://localhost"));
    assert_eq!(document.variables[1].value, None);
    assert!(document.variables[1].sensitive);
    assert_eq!(service.reveal("matriz-admin", ".env.local", "JWT_SECRET").unwrap(), "secret");
}
```

Add separate tests for unsupported filenames, invalid keys, 256-variable and 256-KiB limits, missing `.env.example` keys, revision conflict and comment/order preservation.

- [ ] **Step 2: Run and confirm RED**

Run: `cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --test environment`
Expected: compilation failure because the environment module is missing.

- [ ] **Step 3: Implement parsing, masking and revision validation**

Use a line-oriented document preserving raw comment/blank lines and normalized key/value entries. Calculate revisions with SHA-256. Classify secrets by uppercase key fragments. Save via a sibling temporary file and the existing write-through replacement pattern.

- [ ] **Step 4: Run environment tests**

Run: `cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --test environment`
Expected: PASS without printing fixture values.

- [ ] **Step 5: Commit the environment core**

```powershell
git add apps/matriz-desktop/src-tauri
git commit -m "feat(desktop): add secure environment store"
```

### Task 3: Environment IPC contract

**Files:**
- Modify: `apps/matriz-desktop/src/domain/types.ts`
- Modify: `apps/matriz-desktop/src/application/desktop-gateway.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/command-contract.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/command-contract.test.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/tauri-gateway.ts`
- Modify: `apps/matriz-desktop/src/integration/unavailable-gateway.ts`
- Modify: `apps/matriz-desktop/src-tauri/src/command_contract.rs`
- Modify: `apps/matriz-desktop/src-tauri/tests/command_contract.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`

**Interfaces:**
- Produces gateway methods `listEnvironments`, `readEnvironment`, `revealEnvironmentValue`, `saveEnvironment`.
- Consumes environment service methods from Task 2.

- [ ] **Step 1: Extend command-contract tests first**

Assert exact command names and camelCase payloads for all four environment commands. Extend the native inventory equality test before adding commands.

- [ ] **Step 2: Run and confirm RED**

Run: `corepack pnpm --filter @matriz/app-matriz-desktop exec vitest run src/integration/tauri/command-contract.test.ts`
Expected: FAIL because gateway methods and commands are absent.

- [ ] **Step 3: Add typed IPC and Activity summaries**

Commands accept only app ID, supported env filename, key or structured save request. Publish `environment.saved` with filename and changed-key count only.

- [ ] **Step 4: Run TypeScript and Rust contract tests**

Run both focused command-contract suites and expect PASS.

- [ ] **Step 5: Commit IPC**

```powershell
git add apps/matriz-desktop/src apps/matriz-desktop/src-tauri
git commit -m "feat(desktop): expose environment commands"
```

### Task 4: Environment Manager UI and runtime composition

**Files:**
- Create: `apps/matriz-desktop/src/ui/workspace/environment-manager.tsx`
- Create: `apps/matriz-desktop/src/ui/workspace/environment-manager.test.tsx`
- Create: `apps/matriz-desktop/src/ui/workspace/workspace-view.tsx`
- Modify: `apps/matriz-desktop/src/ui/app.tsx`
- Modify: `apps/matriz-desktop/src/ui/styles.css`
- Modify: `apps/matriz-desktop/src/ui/icons.tsx`

**Interfaces:**
- Produces: `EnvironmentManager` and `WorkspaceView`.
- Consumes: environment gateway, `RuntimeInstance`, `restartRuntime`, `Feedback`.

- [ ] **Step 1: Write failing UI tests**

Test masked-by-default display, one-key reveal, edit/add/delete local draft, validation errors, revision-conflict error and Apply & Restart only for a managed runtime.

- [ ] **Step 2: Run and confirm RED**

Run: `corepack pnpm --filter @matriz/app-matriz-desktop exec vitest run src/ui/workspace/environment-manager.test.tsx`
Expected: module-not-found failure.

- [ ] **Step 3: Implement the dense three-panel surface**

Use semantic buttons/table labels, visible unsaved count, per-row reveal, explicit save and Apply & Restart. Clear revealed values when switching app/file or after save.

- [ ] **Step 4: Run focused UI tests and accessibility assertions**

Expected: PASS with no React console warnings.

- [ ] **Step 5: Commit the ENV surface**

```powershell
git add apps/matriz-desktop/src
git commit -m "feat(desktop): add environment manager"
```

### Task 5: Native Explorer and bounded previews

**Files:**
- Create: `apps/matriz-desktop/src-tauri/src/explorer.rs`
- Create: `apps/matriz-desktop/src-tauri/tests/explorer.rs`
- Modify: `apps/matriz-desktop/src-tauri/Cargo.toml`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`

**Interfaces:**
- Produces: `ExplorerService::{list, preview, open_editor, reveal, rename, duplicate, recycle}`.
- Consumes: `WorkspaceResourceService`.

- [ ] **Step 1: Write failing Explorer tests**

Cover directory sort/filter, 256-KiB text limit, 8-MiB image limit, MIME mapping, unsupported binary metadata, overwrite refusal, protected `.env`/workspace markers and traversal/symlink rejection.

- [ ] **Step 2: Run and confirm RED**

Run: `cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --test explorer`
Expected: compilation failure because ExplorerService is absent.

- [ ] **Step 3: Implement bounded native operations**

Return base64 data URLs only for allowlisted visual MIME types. Use `code.cmd --reuse-window` when available, then `explorer.exe` fallback for open/reveal. Duplicate refuses directories in v1. Recycle uses the Windows trash adapter and refuses protected targets.

- [ ] **Step 4: Run Explorer and resource tests**

Expected: PASS.

- [ ] **Step 5: Commit Explorer core**

```powershell
git add apps/matriz-desktop/src-tauri
git commit -m "feat(desktop): add bounded project explorer"
```

### Task 6: Explorer IPC and UI

**Files:**
- Modify: the typed gateway/command files listed in Task 3
- Create: `apps/matriz-desktop/src/ui/workspace/file-explorer.tsx`
- Create: `apps/matriz-desktop/src/ui/workspace/file-explorer.test.tsx`
- Modify: `apps/matriz-desktop/src/ui/workspace/workspace-view.tsx`
- Modify: `apps/matriz-desktop/src/ui/styles.css`

**Interfaces:**
- Produces: Explorer gateway methods and `FileExplorer`.
- Consumes: native Explorer service from Task 5.

- [ ] **Step 1: Add failing IPC and UI tests**

Assert exact command payloads, breadcrumb navigation, folder-first list, text/image/unsupported previews, loading/empty/error states, rename/duplicate forms and two-step recycle confirmation.

- [ ] **Step 2: Run and confirm RED**

Run focused command and Explorer component tests; expect missing-method/module failures.

- [ ] **Step 3: Implement typed gateway and Explorer surface**

Keep selected paths relative and reset inspector state on app change. Primary actions await completion, announce status and refresh the directory.

- [ ] **Step 4: Run all scoped tests, types and lint**

Run desktop test, typecheck and lint commands; expect PASS.

- [ ] **Step 5: Commit the completed workspace slice**

```powershell
git add apps/matriz-desktop
git commit -m "feat(desktop): integrate workspace explorer"
```

### Task 7: Visual and native verification

**Files:**
- Modify: `apps/matriz-desktop/README.md`
- Modify: `docs/DECISION-LOG.md`
- Modify only if required by acceptance: `apps/matriz-desktop/acceptance/e2e/visual.e2e.ts`

**Interfaces:**
- Consumes all preceding tasks.
- Produces documented architecture, screenshots and a verified NSIS candidate.

- [ ] **Step 1: Run complete validation**

Run desktop tests, typecheck, lint, Vite build, all Rust tests, `cargo clippy --all-targets -- -D warnings`, and `git diff --check`.

- [ ] **Step 2: Run the renderer and capture wide/compact states**

Verify ENV secret masking, save conflict messaging, Explorer image/text preview, destructive confirmation and no browser console errors.

- [ ] **Step 3: Document boundaries and exclusions**

Record resource addressing, secret non-observability and recoverable deletion in README/Decision Log.

- [ ] **Step 4: Build the NSIS artifact**

Run `corepack pnpm --filter @matriz/app-matriz-desktop package:binary`, then record path, size and SHA-256.

- [ ] **Step 5: Commit verification documentation**

```powershell
git add apps/matriz-desktop/README.md docs/DECISION-LOG.md
git commit -m "docs(desktop): record workspace resource boundary"
```
