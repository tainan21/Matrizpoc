# Matriz Control Operational Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship five compact operational capabilities: ENV compare/promote, variable impact, runtime recovery, package trust receipts, and cataloged runbooks.

**Architecture:** Extend the app-local `DesktopGateway` with exact DTOs and commands. Rust owns filesystem reads and mutations, runtime ownership, commerce receipts, and the fixed runbook catalog; React renders bounded view models and composes only approved interactions. Existing Activity and Action Registry primitives receive safe summaries.

**Tech Stack:** Tauri 2, Rust, React 19, TypeScript, Vitest, Testing Library, MatrizLib design primitives.

**Spec:** `docs/superpowers/specs/2026-08-24-matriz-control-operational-intelligence-design.md`

## Global Constraints

- Work only in `apps/matriz-desktop` plus the global decision log and this plan.
- Never import another app's internals or create a shared package.
- No generic filesystem, URL, process, command, permission, or runbook-step input from React.
- Secret contents never appear in comparison DTOs, search, activity, logs, or tests.
- External runtimes are diagnosis-only and never stopped or adopted.
- Keep one primary action per feature and preserve the existing dense Control visual language.
- Preserve unrelated `next-env.d.ts` changes in the worktree.

---

### Task 1: Typed operational intelligence boundary

**Files:**
- Modify: `apps/matriz-desktop/src/domain/types.ts`
- Modify: `apps/matriz-desktop/src/application/desktop-gateway.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/command-contract.ts`
- Modify: `apps/matriz-desktop/src/integration/tauri/tauri-gateway.ts`
- Modify: `apps/matriz-desktop/src/integration/unavailable-gateway.ts`
- Test: `apps/matriz-desktop/src/integration/tauri/command-contract.test.ts`
- Test: `apps/matriz-desktop/src/integration/tauri/tauri-gateway.test.ts`

**Interfaces:**
- Produces: `compareEnvironments`, `promoteEnvironment`, `findEnvironmentReferences`, `recoverRuntime`, `repairPackage`, `runbookCatalog`, and `runRunbook` gateway methods.
- Produces DTOs: `EnvironmentComparison`, `EnvironmentPromotionRequest`, `EnvironmentReferenceResult`, `RecoveryResult`, `PackageReceipt`, `RunbookDefinition`, `RunbookExecution`.

- [ ] **Step 1: Write failing command-contract tests**

Add literal expectations for these exact command names:

```ts
expect(TAURI_COMMAND_CONTRACT.compareEnvironments).toBe("compare_environments")
expect(TAURI_COMMAND_CONTRACT.promoteEnvironment).toBe("promote_environment")
expect(TAURI_COMMAND_CONTRACT.findEnvironmentReferences).toBe("find_environment_references")
expect(TAURI_COMMAND_CONTRACT.recoverRuntime).toBe("recover_runtime")
expect(TAURI_COMMAND_CONTRACT.repairPackage).toBe("repair_package")
expect(TAURI_COMMAND_CONTRACT.runbookCatalog).toBe("get_runbook_catalog")
expect(TAURI_COMMAND_CONTRACT.runRunbook).toBe("run_runbook")
```

- [ ] **Step 2: Run the two integration tests and confirm RED**

Run: `pnpm --filter @matriz/app-matriz-desktop test -- --run src/integration/tauri/command-contract.test.ts src/integration/tauri/tauri-gateway.test.ts`

Expected: failures because the gateway surface and command keys do not exist.

- [ ] **Step 3: Add minimal DTOs and exact gateway mappings**

Use bounded shapes. In particular, comparison entries expose `sourceState` and
`targetState` (`present`, `missing`, `different`) plus optional non-sensitive
values; reference matches expose only relative path, line and redacted excerpt;
recovery reports `status` and `sessionId`; receipts expose digest and grants.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @matriz/app-matriz-desktop test -- --run src/integration/tauri/command-contract.test.ts src/integration/tauri/tauri-gateway.test.ts && pnpm --filter @matriz/app-matriz-desktop typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```text
feat(desktop): define operational intelligence boundary
```

---

### Task 2: Secret-safe ENV compare and promote

**Files:**
- Modify: `apps/matriz-desktop/src-tauri/src/environment.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/command_contract.rs`
- Test: `apps/matriz-desktop/src-tauri/tests/environment.rs`
- Modify: `apps/matriz-desktop/src/ui/workspace/environment-manager.tsx`
- Modify: `apps/matriz-desktop/src/ui/workspace/environment-manager.test.tsx`
- Modify: `apps/matriz-desktop/src/ui/styles.css`

**Interfaces:**
- Consumes: Task 1 ENV DTOs.
- Produces: `EnvironmentService::compare` and `EnvironmentService::promote`.

- [ ] **Step 1: Write failing Rust tests**

Add fixtures with `.env.local` and `.env.staging` and assert:

```rust
let comparison = service.compare("matriz-admin", ".env.local", ".env.staging").unwrap();
assert_eq!(comparison.entries.iter().find(|x| x.key == "JWT_SECRET").unwrap().source_value, None);
assert_eq!(comparison.entries.iter().find(|x| x.key == "JWT_SECRET").unwrap().status, "different");

let promoted = service.promote(EnvironmentPromotionRequest {
    app_id: "matriz-admin".into(), source_file: ".env.local".into(),
    target_file: ".env.staging".into(), target_revision: target.revision,
    keys: vec!["JWT_SECRET".into()],
}).unwrap();
assert_eq!(service.reveal("matriz-admin", ".env.staging", "JWT_SECRET").unwrap(), "source-secret");
```

Also assert stale revision, same-file promotion and unsupported key rejection.

- [ ] **Step 2: Run the environment Rust test and confirm RED**

Run: `cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --test environment`

- [ ] **Step 3: Implement compare and promote under the ENV save lock**

Reuse `parse`, `revision`, `validate_env_file`, `validate_key`, and
`atomic_write`. Compare secrets by equality inside Rust but serialize no secret
contents. Promotion reads source and target, checks the target revision, replaces
only selected keys, preserves target comments/order, and returns the masked
target document.

- [ ] **Step 4: Add exact Tauri commands and safe activity**

Register `compare_environments` and `promote_environment`. Publish only filenames
and promoted key count; never values.

- [ ] **Step 5: Write failing React tests**

Assert that `COMPARAR` opens a two-column view, sensitive rows contain no secret,
selecting one row enables `PROMOVER 1`, and a successful promotion refreshes the
target document.

- [ ] **Step 6: Run React test and confirm RED**

Run: `pnpm --filter @matriz/app-matriz-desktop test -- --run src/ui/workspace/environment-manager.test.tsx`

- [ ] **Step 7: Implement the compact compare surface**

Keep the existing selector/header. Replace only the table area while comparison
is active. Use one target selector, row checkboxes, `PROMOVER SELECIONADAS`, and
`VOLTAR`. Reuse the dirty-navigation guard.

- [ ] **Step 8: Verify and commit**

Run the scoped Rust/React tests and typecheck. Commit:

```text
feat(desktop): compare and promote environments safely
```

---

### Task 3: Bounded variable Impact Radar

**Files:**
- Modify: `apps/matriz-desktop/src-tauri/src/explorer.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/command_contract.rs`
- Test: `apps/matriz-desktop/src-tauri/tests/explorer.rs`
- Modify: `apps/matriz-desktop/src/ui/workspace/environment-manager.tsx`
- Modify: `apps/matriz-desktop/src/ui/workspace/environment-manager.test.tsx`
- Modify: `apps/matriz-desktop/src/ui/styles.css`

**Interfaces:**
- Consumes: Task 1 reference DTO.
- Produces: `ExplorerService::find_environment_references`.

- [ ] **Step 1: Write failing Rust boundary tests**

Create source files containing `DATABASE_URL`, plus ignored, binary, oversized
and symlinked fixtures. Assert literal relative paths and line numbers, a maximum
of 50 matches across 2,000 scanned files, ignored directories excluded, and no
secret value in excerpts.

- [ ] **Step 2: Run Explorer test and confirm RED**

Run: `cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml --test explorer`

- [ ] **Step 3: Implement bounded iterative search**

Search only `ts`, `tsx`, `js`, `jsx`, `json`, `md`, `rs`, `toml`, `yaml`, `yml`
files up to 256 KiB. Do not follow symlinks. Redact quoted/assigned text after
the searched key and normalize paths through `WorkspaceResourceService`.

- [ ] **Step 4: Add exact command and safe activity summary**

The command accepts catalog app ID plus validated ENV key. Activity detail is
`<key> · <count> referências` only.

- [ ] **Step 5: Write failing UI test and implement the inspector**

Add one `IMPACTO` button per ENV row. The right inspector shows count, relative
matches and one `ABRIR NO EDITOR` action using the existing exact resource
command. Loading, empty and error states remain inside the inspector.

- [ ] **Step 6: Verify and commit**

Run scoped tests and typecheck. Commit:

```text
feat(desktop): add environment impact radar
```

---

### Task 4: Ownership-safe Runtime Recovery

**Files:**
- Create: `apps/matriz-desktop/src-tauri/src/recovery.rs`
- Create: `apps/matriz-desktop/src-tauri/tests/recovery.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/command_contract.rs`
- Modify: `apps/matriz-desktop/src/ui/app.tsx`
- Modify: `apps/matriz-desktop/src/ui/app.test.tsx`
- Modify: `apps/matriz-desktop/src/ui/styles.css`

**Interfaces:**
- Consumes: Task 1 `RecoveryResult`.
- Produces: exact `recover_runtime(appId)` command.

- [ ] **Step 1: Write failing pure recovery-policy tests**

Test `recovery_decision(runtime)` with literal outcomes:

```rust
assert_eq!(recovery_decision(managed_unhealthy), RecoveryDecision::Restart);
assert_eq!(recovery_decision(stopped_unowned), RecoveryDecision::Start);
assert_eq!(recovery_decision(external_degraded), RecoveryDecision::DiagnoseOnly);
```

Reject unknown app IDs and prove external ownership never reaches a stop action.

- [ ] **Step 2: Run recovery test and confirm RED**

- [ ] **Step 3: Implement policy and exact orchestration command**

Factor the existing restart/start logic into ownership-aware helpers. Start an
unowned stopped app, restart an existing managed app, reject external recovery,
and poll its catalog port for at most 10 seconds. Return `ready` or a bounded
error; publish start/completion/failure activity.

- [ ] **Step 4: Write failing Apps UI test**

Render a managed degraded runtime, assert a single `RECUPERAR <app>` button,
execute it, and verify the tile returns to ready. Assert external degraded shows
`DIAGNÓSTICO EXTERNO` without a recovery button.

- [ ] **Step 5: Implement the recovery strip**

Show it only below the selected/affected app tile. Reuse Terminal, Doctor and
Activity rather than adding a new page.

- [ ] **Step 6: Verify and commit**

```text
feat(desktop): add ownership-safe runtime recovery
```

---

### Task 5: Package Trust Center and repair receipts

**Files:**
- Modify: `apps/matriz-desktop/src-tauri/src/commerce.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/command_contract.rs`
- Test: `apps/matriz-desktop/src-tauri/tests/commerce.rs`
- Modify: `apps/matriz-desktop/src/domain/types.ts`
- Modify: `apps/matriz-desktop/src/ui/store/store-view.tsx`
- Modify: `apps/matriz-desktop/src/ui/store/store-view.test.tsx`
- Modify: `apps/matriz-desktop/src/ui/styles.css`

**Interfaces:**
- Consumes: Task 1 receipt and repair gateway methods.
- Produces: deterministic `manifest_digest`, persisted `InstallReceipt`, and
  package `trustStatus` (`verified`, `changed`, `missing`).

- [ ] **Step 1: Write failing commerce tests**

Assert installation rejects missing or extra permission grants, persists a
receipt with exact catalog grants and a 64-character digest, restores as
`verified`, reports tampered receipts as `changed`, and `repair` restores only
trusted catalog metadata.

- [ ] **Step 2: Run commerce tests and confirm RED**

- [ ] **Step 3: Implement receipt persistence and migration**

Add `#[serde(default)] receipts` to version 1 state for compatibility. Digest a
canonical string made only from bundled catalog fields. Validate that grants
equal the catalog set. Installation and repair write a new receipt atomically;
uninstall removes it.

- [ ] **Step 4: Write failing Store tests**

Assert install first opens consent, permission descriptions are visible, confirm
sends the exact permission IDs, verified receipt is rendered, and changed state
offers one `REPARAR` action.

- [ ] **Step 5: Implement the Trust Center inside Store detail**

No new top-level mode. Add plain-language permission copy, a compact consent
sheet, trust badge, digest abbreviation and install timestamp. Keep acquisition
unchanged.

- [ ] **Step 6: Verify and commit**

```text
feat(desktop): add package trust receipts
```

---

### Task 6: Cataloged Operational Runbooks

**Files:**
- Create: `apps/matriz-desktop/src-tauri/src/runbooks.rs`
- Create: `apps/matriz-desktop/src-tauri/tests/runbooks.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/lib.rs`
- Modify: `apps/matriz-desktop/src-tauri/src/command_contract.rs`
- Create: `apps/matriz-desktop/src/ui/runbooks/runbook-panel.tsx`
- Create: `apps/matriz-desktop/src/ui/runbooks/runbook-panel.test.tsx`
- Modify: `apps/matriz-desktop/src/ui/app.tsx`
- Modify: `apps/matriz-desktop/src/ui/styles.css`

**Interfaces:**
- Consumes: ENV validation, Doctor and recovery primitives from Tasks 2–4.
- Produces: fixed `RunbookDefinition` catalog and `RunbookExecution` result.

- [ ] **Step 1: Write failing Rust catalog tests**

Assert exactly these IDs and immutable steps:

```text
validate-environment → environment.validate, doctor.run
recover-open → runtime.recover, runtime.open
apply-visualize → environment.validate, runtime.recover, preview.offer
```

Assert unknown IDs and unknown app IDs are rejected and the renderer cannot
submit its own step collection.

- [ ] **Step 2: Run runbook tests and confirm RED**

- [ ] **Step 3: Implement a small native catalog and executor**

The command accepts `{ runbookId, appId }` only. It validates the current ENV,
runs Doctor or recovery as defined, and returns ordered step results. For
`preview.offer`, return the app's `/` target for the UI; do not create a second
preview or accept a URL.

- [ ] **Step 4: Write failing Runbook Panel tests**

Assert the panel lists three runbooks, selecting one shows its fixed steps,
running it displays step progress/result, failure stops later steps, and a
returned preview target exposes one `ABRIR APP` action.

- [ ] **Step 5: Implement the compact vertical stepper**

Place it in Actions below existing Gates. One selected runbook, one app selector,
one primary `EXECUTAR` button. Do not add an editor, graph, schedule or history.

- [ ] **Step 6: Verify and commit**

```text
feat(desktop): add cataloged operational runbooks
```

---

### Task 7: Integration, documentation and release evidence

**Files:**
- Modify: `apps/matriz-desktop/README.md`
- Modify: `apps/matriz-desktop/src/manifest/manifest.ts`
- Modify: `docs/DECISION-LOG.md`
- Modify only if required: `apps/matriz-desktop/acceptance/windows/*`

**Interfaces:**
- Consumes: all completed features.
- Produces: documented native boundaries, final installer and screenshots.

- [ ] **Step 1: Run the condensed React best-practices review**

Check state ownership, async race guards, stable keys, unnecessary effects,
accessible names, keyboard operation and render cost after the TSX changes.

- [ ] **Step 2: Update product documentation**

Document the five capabilities, exact safety boundaries and deliberate deferrals.
Update the manifest capability list without exposing internal commands.

- [ ] **Step 3: Run full verification**

```powershell
pnpm --filter @matriz/app-matriz-desktop lint
pnpm --filter @matriz/app-matriz-desktop typecheck
pnpm --filter @matriz/app-matriz-desktop test
pnpm --filter @matriz/app-matriz-desktop build
$env:CARGO_BUILD_JOBS='2'
cargo test --manifest-path apps/matriz-desktop/src-tauri/Cargo.toml
git diff --check
```

- [ ] **Step 4: Request independent code review and fix all Critical/Important findings**

Review security boundaries, ENV secrecy, external ownership, commerce integrity,
runbook authority and async UI selection races.

- [ ] **Step 5: Perform visual verification**

Capture the four representative states at 1280 × 720. Compare them against the
existing Control captures for hierarchy, spacing, borders, typography and
action density; fix visible regressions.

- [ ] **Step 6: Package the Windows installer**

Run `pnpm --filter @matriz/app-matriz-desktop package`, record its SHA-256 and
verify only unrelated pre-existing files remain dirty.

- [ ] **Step 7: Commit**

```text
docs(desktop): record operational intelligence boundaries
```
