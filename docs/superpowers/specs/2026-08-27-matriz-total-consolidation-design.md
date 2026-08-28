# Matriz Hub Total Consolidation Design

## Goal

Produce the safest current Matriz Hub baseline, preserve historical work, remove generated artifacts from the deliverable, and install and exercise the newest Matriz Control built from that baseline.

## Baseline

Start from `origin/main` at `7b44e9c`. This line contains the selective V1 consolidation and the verified release documentation. Historical, checkpoint, backup, and rescue refs remain untouched and serve as preservation evidence.

## Consolidation strategy

1. Classify every relevant branch by ancestry, patch equivalence, touched scope, and observable result.
2. Treat `backup/*`, `checkpoint/*`, and `rescue/*` as preservation refs unless they contain a result absent from the baseline.
3. Integrate only committed, relevant work that is not already represented by the V1 consolidation. Prefer focused cherry-picks or an intentional reconstruction over broad merges from divergent historical lines.
4. Never carry tracked build outputs such as `dist`, `target`, installers, logs, caches, or the 199 MB `app.asar` introduced by `79e9e36`.
5. Keep product domain app-local and retain public-contract boundaries.

## Matriz Control

The repository has two Control surfaces: the Electron/Next application in `apps/matriz-control` and the Tauri native host in `apps/matriz-desktop`. The newest usable Control will be selected from the consolidated code after comparing their functionality and packaging paths. A fresh installer will be built, hashed, installed for the current user, opened, and exercised. Any previous installed version will be removed only through its supported uninstaller.

## Validation

Run scoped Control tests, lint, typecheck, and build; Rust checks for the Tauri host when used; smoke and boundary gates for consolidated/root changes; installer hash verification; installed-product startup and functional inspection; and final Git cleanliness/ancestry checks.

## Delivery

Push `codex/matriz-total-consolidation`, create a pull request against `main`, and merge only after the local gates and remote PR state permit it. Never force-push or delete preservation refs.
