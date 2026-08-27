# Git Consolidation V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the valid work from the last 30 days into a clean, pushable V1 snapshot on `main` without generated installers, build output, or oversized blobs.

**Architecture:** Build one reviewed snapshot from `codex/universal-project-host` on top of `origin/main`, preserving the final source tree while excluding unsafe intermediate history. Keep obsolete Seumei shell work out because the canonical product moved from `apps/seumei` to `apps/seumeiapp`.

**Tech Stack:** Git, PowerShell, pnpm 9, Vitest, Prisma

**Spec:** User request in the Codex task dated 2026-08-27.

## Global Constraints

- Preserve all existing worktrees and untracked user files.
- Do not include installers, packaged apps, generated build output, logs, caches, `.env` files, or blobs at/above GitHub's 100 MB limit.
- Keep local installers accessible on disk; ignoring them must not delete them.
- Use a single V1 summary commit for the consolidated snapshot.
- Update `main` only after fresh verification succeeds.

---

### Task 1: Consolidated source snapshot

**Files:**
- Modify: repository tree relative to `origin/main`
- Create: `docs/superpowers/plans/2026-08-27-git-consolidation-v1.md`

**Interfaces:**
- Consumes: final tree of `codex/universal-project-host`
- Produces: one reviewable staged snapshot on `codex/v1-consolidation-2026-08-27`

- [ ] **Step 1: Apply the valid branch as a squash**

Run: `git merge --squash codex/universal-project-host`

Expected: changes are staged without importing the branch's intermediate commit history.

- [ ] **Step 2: Inspect the staged tree**

Run: `git status --short` and `git diff --cached --stat`

Expected: source/config/docs changes only; no merge conflict.

### Task 2: Repository hygiene

**Files:**
- Modify: `.gitignore`
- Remove from snapshot: generated paths such as `output/`

**Interfaces:**
- Consumes: staged consolidated snapshot
- Produces: a final tree safe for normal GitHub pushes

- [ ] **Step 1: Add durable ignore rules**

Cover worktrees, incoming migration sources, build/package folders, installers, archives, logs, caches, generated Prisma clients, and temporary evidence.

- [ ] **Step 2: Remove generated paths from the staged snapshot**

Run: `git rm --cached` only for generated paths that are present in the staged tree.

Expected: local artifacts remain available where applicable, but the commit does not track them.

- [ ] **Step 3: Audit the final staged tree**

Run size, filename, secret-pattern, and ignored-file checks against the staged snapshot.

Expected: no blob reaches 100 MB, no `.env`/private-key file is tracked, and installer/build paths are absent.

### Task 3: Verification and integration

**Files:**
- Test: `tests/smoke/**`
- Test: affected workspace packages through root typecheck/lint commands

**Interfaces:**
- Consumes: clean staged V1 snapshot
- Produces: verified V1 commit and updated remote `main`

- [ ] **Step 1: Generate required clients and run smoke tests**

Run: `corepack pnpm prisma:generate` then `corepack pnpm test:smoke`

Expected: all smoke test files and tests pass.

- [ ] **Step 2: Run repository typecheck and lint**

Run: `corepack pnpm typecheck` and `corepack pnpm lint`

Expected: both commands exit successfully, or any pre-existing/non-consolidation failure is documented and resolved before push.

- [ ] **Step 3: Commit the snapshot**

Run: `git commit -m "v1 merge: consolidate recent branches and repository hygiene"`

Expected: one new commit on `codex/v1-consolidation-2026-08-27`.

- [ ] **Step 4: Re-audit commit history and update main**

Verify the outgoing range contains no blob at/above 100 MB, fast-forward local `main`, and push `main` without force.

Expected: `origin/main` points to the verified V1 commit and the GitHub size rejection is gone.
