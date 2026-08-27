# Agent Operating Kernel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local-first, auditable team-of-agents operating model to Matriz Workbench.

**Architecture:** App-local domain schemas, use cases and filesystem persistence write revisioned records below each project’s `.matriz/agents/**`. Presenters produce UI-only snapshots and `/team` uses server actions; no runner, MCP mutation, Control change, database or shared package is introduced.

**Tech Stack:** Next.js, TypeScript, Zod, Vitest, existing Workbench filesystem repository and presenters.

**Spec:** `docs/superpowers/specs/2026-08-27-agent-operating-kernel-design.md`

## Global Constraints

- Touch only `apps/matriz-workbench/**` except app-local tests and documentation.
- Preserve local-first Git-backed `.matriz/**` ownership; no database or remote runner.
- UI only consumes view models; domain is app-local.
- No MCP write tools and no implicit agent authority.
- Completion requires evidence and a human reviewer decision.

---

### Task 1: Agent domain and mission invariants

**Files:** Create `apps/matriz-workbench/src/domain/agent-operations.ts`, `apps/matriz-workbench/src/domain/agent-operations.test.ts`.

- [ ] Write failing Zod and transition tests for profiles, missions, safe relative paths, evidence and human-reviewed completion.
- [ ] Implement schemas, `createMission`, `addEvidence`, `reviewMission`, and strict revision checks.
- [ ] Run `pnpm --filter @matriz/app-matriz-workbench test -- src/domain/agent-operations.test.ts`.

### Task 2: Filesystem repository and team service

**Files:** Modify `apps/matriz-workbench/src/integration/filesystem/workspace-repository.ts`; create tests and `src/application/agent-team-service.ts`.

- [ ] Write failing tests for atomic `.matriz/agents/**` records and non-overwriting Nilo/Zara seed profiles.
- [ ] Implement app-local repository methods and service orchestration.
- [ ] Run focused repository and application tests.

### Task 3: View models and Team route

**Files:** Create app-local presenter, UI components, `app/(workspace)/team/page.tsx`, server actions and tests; modify shell navigation and manifest route.

- [ ] Write failing presenter/component tests proving entities never reach UI.
- [ ] Implement read-only-first Team snapshot plus local server actions for profile, mission, handoff, evidence and review.
- [ ] Run Workbench test, lint and typecheck.

### Task 4: Documentation and verification

**Files:** Modify Workbench README/handbook only where needed.

- [ ] Document authority levels, storage paths and explicit non-goals.
- [ ] Run app test/lint/typecheck, `pnpm test:smoke`, `pnpm verify:boundaries` and `git diff --check`.
