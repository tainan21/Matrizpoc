# Repository Assimilation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assimilate all active product branches into one clean, pushed integration branch with a green monorepo build and complete visual/report evidence for every application route.

**Architecture:** Treat `codex/matriz-hub-alpha` as the preservation branch because it owns the current dirty workspace, then merge only active feature histories that contain commits absent from the chosen integration line. Historical backup branches are audit inputs, not merge inputs. Fix failures at their owning app or package, preserve app boundaries, and verify the final tree through build, lint, typecheck, smoke tests, route navigation, screenshots, and a clean Git status.

**Tech Stack:** pnpm 9.12.0 via Corepack, Turborepo, Next.js 16, TypeScript, Vitest, Playwright CLI, Git.

**Spec:** `AGENTS.md`, `docs/architectural-laws.md`, `docs/monorepo-structure.md`, `docs/app-communication.md`, `docs/CHANGE-SAFETY.md`

## Global Constraints

- Never import `apps/<other-app>/src/**` or `apps/<other-app>/app/**`.
- Keep product domain inside its owning app; do not create shared packages during assimilation.
- Preserve all pre-existing dirty-worktree changes and commits.
- Do not commit `.env`, logs, `.next`, `.turbo`, temporary screenshots, caches, or build output.
- Use scoped validation after app-local fixes and global validation after merges or shared-package changes.
- Do not merge historical `backup/*` branches unless commit analysis proves they contain required product work absent from every active branch.

---

### Task 1: Establish the reproducible baseline

**Files:**
- Create: `docs/superpowers/plans/2026-08-25-repository-assimilation.md`
- Inspect: root Git metadata, workspace manifests, app instructions, and package instructions

**Interfaces:**
- Consumes: repository state and architectural laws
- Produces: recorded build failure, branch inventory, route inventory, and protected dirty-file inventory

- [ ] Record `git status --short --branch`, `git worktree list --porcelain`, local/remote branches, and unmerged commits.
- [ ] Run `corepack pnpm build` and retain the first complete failing diagnostic.
- [ ] Read each affected app's `AGENTS.md`, `docs/AGENT-START-HERE.md`, `README.md`, manifest, and bootstrap before editing it.
- [ ] Confirm ignored secrets/logs/build artifacts remain untracked.

### Task 2: Restore the baseline build

**Files:**
- Modify only the package or app named by the reproduced failure
- Test the owning package/app using its declared scripts

**Interfaces:**
- Consumes: exact compiler/build diagnostic from Task 1
- Produces: the smallest boundary-safe fix and a new full-build diagnostic

- [ ] Compare the broken contract with a working sibling implementation in the same package/app.
- [ ] State one cause hypothesis and test it with the smallest relevant typecheck or test command.
- [ ] Apply one root-cause fix with `apply_patch`.
- [ ] Run the scoped verification, then rerun `corepack pnpm build`; repeat this task for each newly exposed failure.

### Task 3: Assimilate active branch histories

**Files:**
- Modify: Git history on `codex/matriz-hub-alpha`
- Preserve: all dirty files identified in Task 1

**Interfaces:**
- Consumes: fetched refs, merge-base/patch-id evidence, and green baseline
- Produces: one integration history containing every non-duplicated active feature commit

- [ ] Compare every `codex/*` tip to the current branch using ancestry, merge-base, unique-commit, and diff-stat evidence.
- [ ] Exclude backup branches and exact/patch-equivalent duplicates; record each reason in the final report.
- [ ] Commit the pre-existing coherent local changes before merging so conflict resolution is recoverable.
- [ ] Merge active branches in dependency order, resolving conflicts inside the smallest owning scope and documenting each merge result.
- [ ] After every merge, run at least the affected app/package typecheck or tests; after the final merge, run the full build.

### Task 4: Complete repository validation

**Files:**
- Modify only files required by reproduced validation failures

**Interfaces:**
- Consumes: assimilated integration tree
- Produces: fresh zero-exit evidence for build, lint, typecheck, smoke tests, and relevant app/package tests

- [ ] Run `corepack pnpm build`.
- [ ] Run `corepack pnpm lint`.
- [ ] Run `corepack pnpm typecheck`.
- [ ] Run `corepack pnpm test:smoke`.
- [ ] Run package/app-specific test scripts for every touched scope and fix each reproducible failure by cause.
- [ ] Run forbidden-import and tracked-artifact checks described by repository policy.

### Task 5: Verify every app route visually

**Files:**
- Create: ignored artifacts under `output/playwright/assimilation-2026-08-25/`
- Create: route results consumed by the final report

**Interfaces:**
- Consumes: final production-capable app tree and route inventory from `app/**/page.*`
- Produces: one route status record and one screenshot per reachable static/dynamic route scenario

- [ ] Start each application on its declared port using its app-local dev command and wait for readiness.
- [ ] Resolve dynamic routes using repository fixtures or documented sample IDs; record routes that require auth or unavailable external state.
- [ ] Navigate every route with Playwright, capture HTTP/navigation errors and browser console errors, and save a full-page PNG.
- [ ] Re-run any failed route after a root-cause fix and replace its evidence only when the route is clean.

### Task 6: Deliver the report and clean integration point

**Files:**
- Create: `docs/reports/2026-08-25-assimilation-report.md`
- Create: `output/pdf/matriz-assimilation-report-2026-08-25.pdf`

**Interfaces:**
- Consumes: merge ledger, validation logs, route results, and screenshots
- Produces: human-readable report, PDF, committed integration history, pushed remote branch, and clean worktree

- [ ] Write the report with scope, branch-by-branch disposition, code changes, boundary risks, validation evidence, complete app/route matrix, and links to screenshots.
- [ ] Generate the PDF from the report, render it to PNG, and inspect every page for clipping or unreadable content.
- [ ] Rerun the complete validation suite on the exact tree to be committed.
- [ ] Commit the final fixes and report with no ignored artifacts staged.
- [ ] Push `codex/matriz-hub-alpha` without force and verify the local branch matches its upstream.
- [ ] Confirm `git status --short --branch` is clean and report the final commit SHA.
