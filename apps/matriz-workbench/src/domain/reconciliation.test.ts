import { describe, expect, it } from "vitest"
import type { AgentRequest } from "./schemas"
import { reconcileExecution } from "./reconciliation"

function request(): AgentRequest {
  return {
    schemaVersion: 1,
    id: "req_00000000-0000-4000-8000-000000000001",
    projectId: "matriz-workbench",
    backlogItemId: "wi_00000000-0000-4000-8000-000000000001",
    title: "Reconcile execution",
    instructions: "",
    status: "completed",
    claimedBy: "codex:thread-a",
    resultSummary: "Implementation completed.",
    changedFiles: ["apps/matriz-workbench/src/domain/schemas.ts"],
    checks: ["pnpm test"],
    executionClaim: {
      requestId: "req_00000000-0000-4000-8000-000000000001",
      claimedBy: "codex:thread-a",
      executionMode: "change",
      intendedFiles: ["apps/matriz-workbench/src/domain/schemas.ts"],
      intendedSurfaces: ["workbench-agent-lifecycle"],
      plannedChecks: ["pnpm test"],
      baseGit: { commit: "a".repeat(40), dirtyPaths: ["AGENTS.md"], observedAt: "2026-08-04T15:00:00.000Z" },
      lease: {
        acquiredAt: "2026-08-04T15:00:00.000Z",
        renewedAt: "2026-08-04T15:00:00.000Z",
        expiresAt: "2026-08-04T15:30:00.000Z",
        generation: 1,
      },
    },
    review: {
      status: "approved",
      reviewedBy: "Zara",
      reviewedAt: "2026-08-04T15:20:00.000Z",
      note: "Reviewed.",
      runRevision: "run-old-revision",
    },
    createdAt: "2026-08-04T15:00:00.000Z",
    updatedAt: "2026-08-04T15:20:00.000Z",
    revision: "request-revision",
  }
}

describe("execution reconciliation", () => {
  it("accepts files already attributed by an active run", () => {
    const current = { ...request(), status: "in_progress" as const, changedFiles: [], review: undefined }
    const findings = reconcileExecution({
      request: current,
      run: {
        status: "running",
        revision: "run-current",
        changedFiles: ["apps/matriz-workbench/src/domain/schemas.ts"],
        checkExecutions: [],
      },
      git: {
        headCommit: "a".repeat(40),
        changedFiles: ["apps/matriz-workbench/src/domain/schemas.ts"],
        commits: [],
      },
      observedAt: "2026-08-04T15:10:00.000Z",
    })

    expect(findings).not.toContainEqual(
      expect.objectContaining({ code: "observed_file_not_declared" }),
    )
  })

  it("reports declared and observed file divergence without changing either input", () => {
    const current = request()
    const findings = reconcileExecution({
      request: current,
      run: {
        status: "completed",
        revision: "run-current-revision",
        threadId: "thread-a",
        changedFiles: current.changedFiles,
        checkExecutions: [],
      },
      git: {
        headCommit: "b".repeat(40),
        changedFiles: ["apps/matriz-workbench/src/domain/reconciliation.ts"],
        commits: [],
      },
      thread: { available: true, exists: true, status: "completed" },
      observedAt: "2026-08-04T15:25:00.000Z",
    })

    expect(findings.map((finding) => finding.code)).toEqual(expect.arrayContaining([
      "declared_file_not_observed",
      "observed_file_not_declared",
      "review_stale",
    ]))
    expect(current.changedFiles).toEqual(["apps/matriz-workbench/src/domain/schemas.ts"])
  })

  it("reports a running request whose thread is no longer active", () => {
    const current = { ...request(), status: "in_progress" as const, review: undefined }
    const findings = reconcileExecution({
      request: current,
      run: { status: "running", revision: "run-current", threadId: "thread-a", changedFiles: [], checkExecutions: [] },
      git: { headCommit: "a".repeat(40), changedFiles: [], commits: [] },
      thread: { available: true, exists: true, status: "interrupted" },
      observedAt: "2026-08-04T15:10:00.000Z",
    })

    expect(findings).toContainEqual(expect.objectContaining({ code: "thread_terminal_request_active", severity: "error" }))
  })

  it("reports an expired lease separately from execution failure", () => {
    const current = { ...request(), status: "in_progress" as const, review: undefined }
    const findings = reconcileExecution({
      request: current,
      run: { status: "running", revision: "run-current", threadId: "thread-a", changedFiles: [], checkExecutions: [] },
      git: { headCommit: "a".repeat(40), changedFiles: [], commits: [] },
      thread: { available: true, exists: true, status: "active" },
      observedAt: "2026-08-04T16:00:00.000Z",
    })

    expect(findings).toContainEqual(expect.objectContaining({ code: "lease_expired", severity: "warning" }))
  })

  it("reports a commit missing the canonical request trailer", () => {
    const current = request()
    const findings = reconcileExecution({
      request: current,
      run: { status: "completed", revision: "run-old-revision", threadId: "thread-a", changedFiles: current.changedFiles, checkExecutions: [] },
      git: {
        headCommit: "b".repeat(40),
        changedFiles: current.changedFiles,
        commits: [{ id: "b".repeat(40), requestIds: [] }],
      },
      thread: { available: true, exists: true, status: "completed" },
      observedAt: "2026-08-04T15:25:00.000Z",
    })

    expect(findings).toContainEqual(expect.objectContaining({ code: "commit_unlinked", severity: "warning" }))
  })
})
