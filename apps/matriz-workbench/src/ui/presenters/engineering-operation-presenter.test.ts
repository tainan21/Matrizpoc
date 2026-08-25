import { describe, expect, it } from "vitest"
import type { AgentRequest } from "../../domain/schemas"
import { toEngineeringOperationViewModel } from "./engineering-operation-presenter"

describe("engineering operation presenter", () => {
  it("keeps planned, observed and human states visibly separate", () => {
    const request = {
      schemaVersion: 1,
      id: "req_00000000-0000-4000-8000-000000000001",
      projectId: "matriz-workbench",
      backlogItemId: "wi_00000000-0000-4000-8000-000000000001",
      title: "Engineering Operations",
      instructions: "",
      status: "completed",
      claimedBy: "codex:thread-a",
      resultSummary: "Implemented.",
      changedFiles: ["src/domain/reconciliation.ts"],
      checks: ["pnpm test"],
      executionClaim: {
        requestId: "req_00000000-0000-4000-8000-000000000001",
        claimedBy: "codex:thread-a",
        executionMode: "change",
        intendedFiles: ["src/domain"],
        intendedSurfaces: ["agent-lifecycle"],
        plannedChecks: ["pnpm test", "pnpm typecheck"],
        baseGit: { commit: "a".repeat(40), dirtyPaths: ["AGENTS.md"], observedAt: "2026-08-04T15:00:00.000Z" },
        lease: { acquiredAt: "2026-08-04T15:00:00.000Z", renewedAt: "2026-08-04T15:05:00.000Z", expiresAt: "2026-08-04T15:30:00.000Z", generation: 2 },
      },
      review: { status: "approved", reviewedBy: "Zara", reviewedAt: "2026-08-04T15:20:00.000Z", note: "Reviewed.", runRevision: "run-old" },
      createdAt: "2026-08-04T15:00:00.000Z",
      updatedAt: "2026-08-04T15:20:00.000Z",
      revision: "request-revision",
    } satisfies AgentRequest

    const view = toEngineeringOperationViewModel(request, {
      attempts: [{ status: "completed" }],
      checkExecutions: [{ name: "Tests", state: "passed" }],
    }, {
      status: "divergent",
      findings: [{ severity: "error", summary: "Review stale." }],
    })

    expect(view).toMatchObject({
      modeLabel: "mudança",
      owner: "codex:thread-a",
      plannedChecks: ["pnpm test", "pnpm typecheck"],
      executedChecks: [{ name: "Tests", statusLabel: "passou" }],
      humanReviewLabel: "aprovada",
      reconciliationLabel: "divergente",
    })
    expect(view.preexistingPaths).toEqual(["AGENTS.md"])
  })
})
