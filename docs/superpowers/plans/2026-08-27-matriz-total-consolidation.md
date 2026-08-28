# Matriz Hub Total Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the best committed Matriz work, produce and install the newest Matriz Control, validate it functionally, and merge the audited result into `main`.

**Architecture:** Use a clean branch from `origin/main`, classify divergent history before selecting changes, and keep generated artifacts outside Git. Validate both source boundaries and the installed Windows application.

**Tech Stack:** Git, pnpm 9/Corepack, Next.js 16, Electron Builder, Tauri 2, Rust, NSIS, PowerShell, GitHub CLI.

**Spec:** `docs/superpowers/specs/2026-08-27-matriz-total-consolidation-design.md`

## Global Constraints

- Preserve branches, worktrees, checkpoints, backups, and rescue refs.
- Do not use force push, destructive reset, clean, or broad conflict resolution.
- Do not commit installers, `app.asar`, `dist`, `target`, logs, caches, or secrets.
- Never import another app's `src/**` or `app/**`.
- Keep product domain app-local.

---

### Task 1: Historical and worktree audit

- [ ] Record current heads, ancestry, unique commits, tree differences, and dirty worktrees.
- [ ] Classify relevant lines as incorporated, duplicate, preservation-only, or candidate work.
- [ ] Identify conceptual overlaps in Control, Workbench, Hub, Seumei, desktop, Ops, and release work.
- [ ] Select exact commits or file-level intentions to integrate.

### Task 2: Consolidated source

- [ ] Apply only selected committed work to `codex/matriz-total-consolidation`.
- [ ] Resolve conflicts by inspecting both intentions and current architecture.
- [ ] Confirm no prohibited generated artifacts or cross-app internal imports entered the branch.
- [ ] Commit each coherent consolidation unit with an auditable message.

### Task 3: Source validation

- [ ] Install dependencies using the locked workspace configuration.
- [ ] Run Matriz Control test, lint, typecheck, and build.
- [ ] Run Matriz Desktop frontend and Rust gates if it remains the canonical native Control.
- [ ] Run smoke, boundary, and global checks required by every touched high-impact surface.
- [ ] Diagnose and fix only failures directly related to the consolidation.

### Task 4: Installer production and installed acceptance

- [ ] Build the canonical newest Matriz Control installer from the consolidated branch.
- [ ] Calculate and record its exact SHA-256 and size outside Git.
- [ ] Discover the currently installed Control version and supported uninstaller.
- [ ] Uninstall the old version through its supported mechanism, install the new candidate, and verify installed paths/version.
- [ ] Open the installed application and exercise Apps, Workspace, Terminal, Actions, Store, Doctor, settings, Workbench/project, and installer-related flows that are available.
- [ ] Inspect runtime errors, processes, ports, logs, and shutdown behavior; fix and retest mission-related defects.

### Task 5: Final audit and Git delivery

- [ ] Re-run fresh source and installed-product verification.
- [ ] Confirm installer manifest/hash, Git cleanliness, diff quality, and remaining unique branches.
- [ ] Push the consolidation branch without force.
- [ ] Create a pull request against `main`, inspect checks and conflicts, and merge when permitted.
- [ ] Fetch the merged state and report final branch, HEAD, relation to `origin/main`, installers, validation, and real remaining work.
