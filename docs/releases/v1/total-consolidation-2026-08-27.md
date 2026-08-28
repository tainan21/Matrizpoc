# Matriz Hub — total consolidation audit (2026-08-27)

## Decision

The consolidation base is `origin/main` at `7b44e9c`. It is the most complete
reviewable line: its V1 sequence already integrates foundation, identity,
desktop, Seumei/Admin, Hub/MatrizLib, Control/Workbench/Health, Ops/Pay and the
release documentation. The rescue reference remains preserved and no branch or
worktree was removed.

The final review branch is `codex/matriz-total-consolidation`. No source merge
was added merely to record ancestry: the remaining divergent development lines
were either older implementations, generated-artifact checkpoints, or already
represented by the V1 consolidation result.

## History findings

- `backup/pre-consolidation-20260827`, `codex/v1-consolidation-2026-08-27`,
  `master`, and the catalog/orders/store/tenant Seumei lines are contained in
  the selected main line.
- The foundation, universal host, local control runtime, Hub, MatrizLib,
  Workbench, Ops and Pay results are present in the selective V1 commits on
  `main`; their older divergent histories were not replayed over the newer
  architecture.
- `codex/workbench-visual-reform` contains a generated `app.asar` commit rather
  than unique source work. The detached rescue line preserves that history and
  later removes the tracked artifact.
- Dirty historical worktrees were not modified or discarded. They remain
  available for a separate owner review.

## Current installers

Fresh local unsigned packages built from the selected source:

| Surface | Installer | SHA-256 |
| --- | --- | --- |
| Matriz Control (Tauri) | `apps/matriz-desktop/src-tauri/target/release/bundle/nsis/Matriz Control_0.1.0_x64-setup.exe` | `1F459B73DDAC7221808559E0723C26D333D42CE5F2E2D7B8E99B837412CADEEA` |
| Matriz Control (Electron) | `apps/matriz-control/dist/Matriz Control Setup 0.1.0.exe` | `CFEC7805B23F39C7E5CF69629B681F6CE178E5FAA72570B87BD84CC39E10D53A` |

The existing V1 release-pack installers remain under
`output/releases/v1/installers/` in the main release worktree and are described
by `installer-manifest.json`. Seumei Desktop remains intentionally blocked
until its official HTTPS application and Hub URLs are supplied.

## Installed verification

The fresh Tauri NSIS package was installed for the current user at
`C:\Users\taina\AppData\Local\Matriz Control`. Its installed executable and
uninstaller are registered in Windows. The application opened successfully,
and its Apps, Workspace, Terminal, Actions, Store and Doctor views were
inspected. Doctor reports the consolidation worktree as ready with Node, pnpm
and Git available.

The previously used lowercase Start-menu shortcut pointed directly at a binary
inside an old Codex worktree. It was not a registered application install and
was the source of the stale Control experience.

## Verification performed

- frozen workspace dependency installation: passed;
- Electron Control: 252 tests passed, lint passed, typecheck passed, build and
  NSIS packaging passed;
- Tauri Control: 74 frontend tests passed with 1 skipped, lint passed,
  typecheck passed, Rust unit/integration tests passed, and NSIS packaging
  passed;
- installed UI launch and Doctor workspace/toolchain diagnosis: passed.
- repository boundary verification: all apps passed;
- global smoke suite after official Prisma client generation: 50 files and
  366 tests passed.

The first PR validation exposed a pre-existing CI bootstrap gap: migration
roles owned their schemas but lacked database-level `CREATE`, and the role list
omitted the already-supported `ops` and `pay` schemas. The preparation SQL now
creates all eight role pairs and grants database `CREATE` only to migration
roles; runtime roles remain restricted.

All generated build outputs remain ignored. No generated `app.asar` is included
in this consolidation change.
