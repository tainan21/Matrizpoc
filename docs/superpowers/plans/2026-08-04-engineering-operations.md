# Engineering Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make agent execution traceable from scoped ownership through factual result, human review, and read-only reconciliation with Codex threads and Git.

**Architecture:** Keep the protocol as app-local Workbench domain logic. Extend existing request/run records additively, preserve V1 read compatibility, expose only named MCP workflows, and make reconciliation report divergences without mutating Git or governance state.

**Tech Stack:** TypeScript, Zod, Vitest, file-backed atomic persistence, MCP STDIO, Codex App Server.

## Global Constraints

- Never edit `.matriz/**` directly.
- Preserve product, validation, documentation, execution, and human-review states independently.
- `AgentRequest.id` is the canonical V1 correlation identifier.
- Existing records remain readable without rewrite-on-read.
- Git and thread reconciliation is read-only.
- No new shared package; this is strong Workbench domain logic.
- Preserve all pre-existing working-tree changes.

---

### Task 1: Operation contract and claim policy

**Files:**
- Create: `apps/matriz-workbench/src/domain/engineering-operation.ts`
- Create: `apps/matriz-workbench/src/domain/engineering-operation.test.ts`
- Modify: `apps/matriz-workbench/src/domain/schemas.ts`
- Modify: `apps/matriz-workbench/src/domain/agent-request-policy.ts`

- [ ] Specify claim, lease, scope-conflict, dirty-baseline, and plan-only behavior with failing tests.
- [ ] Implement the minimum domain contract and watch the focused tests pass.
- [ ] Preserve legacy request parsing with additive optional fields.

### Task 2: Attempts, checks, and evidence

**Files:**
- Create: `apps/matriz-workbench/src/domain/execution-evidence.ts`
- Create: `apps/matriz-workbench/src/domain/execution-evidence.test.ts`
- Modify: `apps/matriz-workbench/src/domain/codex-run.ts`

- [ ] Specify attempt states, interruption, check lifecycle, expiry, and provenance with failing tests.
- [ ] Implement typed evidence while retaining legacy string projections.

### Task 3: Read-only reconciliation

**Files:**
- Create: `apps/matriz-workbench/src/domain/reconciliation.ts`
- Create: `apps/matriz-workbench/src/domain/reconciliation.test.ts`
- Create: `apps/matriz-workbench/src/application/reconciliation-service.ts`
- Create: `apps/matriz-workbench/src/integration/git/git-observation-provider.ts`

- [ ] Specify findings for missing threads, file divergence, stale review, expired lease, and overlapping claims.
- [ ] Implement deterministic comparison with no correction side effects.
- [ ] Implement bounded Git observations without persisting diff contents.

### Task 4: Persistence and runtime integration

**Files:**
- Modify: `apps/matriz-workbench/src/integration/filesystem/workspace-repository.ts`
- Modify: `apps/matriz-workbench/src/integration/filesystem/workspace-repository.test.ts`
- Modify: `apps/matriz-workbench/src/integration/codex/codex-run-store.ts`
- Modify: `apps/matriz-workbench/src/application/codex-run-manager.ts`
- Modify: `apps/matriz-workbench/src/application/codex-run-manager.test.ts`

- [ ] Persist claims under request-scoped locks and reject stale/overlapping claims.
- [ ] Record attempts and interruption without moving product state.
- [ ] Complete plan-only without invented checks and change execution with factual evidence.

### Task 5: MCP and diagnostics

**Files:**
- Modify: `apps/matriz-workbench/src/mcp/server.ts`
- Modify: `apps/matriz-workbench/src/cli/verify-mcp.ts`
- Create: `apps/matriz-workbench/src/application/engineering-operation-service.ts`

- [ ] Expose named read and write workflows for context, conflicts, checkpoint, interruption, result, and reconciliation.
- [ ] Verify annotations, schemas, path safety, authority, and absence of generic filesystem access.

### Task 6: Documentation and institutional contract

**Files:**
- Confirm only (no edit in this front): root `AGENTS.md`
- Modify: `apps/matriz-workbench/AGENTS.md`
- Modify: `apps/matriz-workbench/docs/MCP.md`
- Modify: `apps/matriz-workbench/docs/CODEX-APP-SERVER.md`
- Modify: `apps/matriz-workbench/docs/FILE-PROTOCOL.md`
- Modify: `apps/matriz-workbench/docs/agent-handbook/03-OPERATING-PROTOCOL.md`
- Modify: `apps/matriz-workbench/docs/agent-handbook/05-COWORKING-AND-MULTIAGENTS.md`
- Modify: `apps/matriz-workbench/docs/agent-handbook/06-CONTRACTS-FREEDOM-SECURITY.md`
- Modify: `apps/matriz-workbench/docs/agent-handbook/07-EXAMPLES.md`

- [ ] Document the state machine, canonical identity, claim/lease behavior, activity budget, dirty-tree handling, interruption, reconciliation, and human gates.

### Task 7: Verification

- [ ] Run focused tests after every red-green cycle.
- [ ] Run the complete Workbench test suite.
- [ ] Run lint, typecheck, `verify:mcp`, and build.
- [ ] Inspect the final diff and working tree; separate pre-existing changes from this plan.
- [ ] Leave product acceptance, score, gates, release, and human approval pending.
