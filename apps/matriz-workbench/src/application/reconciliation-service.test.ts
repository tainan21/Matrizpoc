import { describe, expect, it } from "vitest"
import type { AgentRequest } from "../domain/schemas"
import { ReconciliationService } from "./reconciliation-service"

const request: AgentRequest = {
  schemaVersion: 1,
  id: "req_00000000-0000-4000-8000-000000000001",
  projectId: "matriz-workbench",
  backlogItemId: "wi_00000000-0000-4000-8000-000000000001",
  title: "Reconcile",
  instructions: "",
  status: "in_progress",
  claimedBy: "codex:thread-a",
  changedFiles: [],
  checks: [],
  executionClaim: {
    requestId: "req_00000000-0000-4000-8000-000000000001",
    claimedBy: "codex:thread-a",
    executionMode: "change",
    intendedFiles: ["apps/matriz-workbench/src/domain/schemas.ts"],
    intendedSurfaces: [],
    plannedChecks: ["pnpm test"],
    baseGit: { commit: "a".repeat(40), dirtyPaths: [], observedAt: "2026-08-04T15:00:00.000Z" },
    lease: {
      acquiredAt: "2026-08-04T15:00:00.000Z",
      renewedAt: "2026-08-04T15:00:00.000Z",
      expiresAt: "2026-08-04T15:30:00.000Z",
      generation: 1,
    },
  },
  createdAt: "2026-08-04T15:00:00.000Z",
  updatedAt: "2026-08-04T15:00:00.000Z",
  revision: "request-revision",
}

describe("ReconciliationService", () => {
  it("returns a divergent read-only snapshot from repository, run, Git and thread observations", async () => {
    const service = new ReconciliationService({
      getRequest: async () => request,
      getRun: async () => ({
        status: "running",
        revision: "run-revision",
        threadId: "thread-a",
        changedFiles: [],
        checkExecutions: [],
      }),
      observeGit: async () => ({ headCommit: "a".repeat(40), changedFiles: [], commits: [] }),
      observeThread: async () => ({ available: true, exists: true, status: "interrupted" }),
      now: () => "2026-08-04T15:10:00.000Z",
    })

    const snapshot = await service.reconcile("matriz-workbench", request.id)

    expect(snapshot.status).toBe("divergent")
    expect(snapshot.findings).toContainEqual(expect.objectContaining({ code: "thread_terminal_request_active" }))
    expect(snapshot.requestRevision).toBe("request-revision")
  })

  it("reports unavailable when an observation provider cannot answer", async () => {
    const service = new ReconciliationService({
      getRequest: async () => request,
      getRun: async () => undefined,
      observeGit: async () => { throw new Error("Git unavailable") },
      observeThread: async () => ({ available: false, exists: false, status: "unknown" }),
      now: () => "2026-08-04T15:10:00.000Z",
    })

    await expect(service.reconcile("matriz-workbench", request.id)).resolves.toMatchObject({
      status: "unavailable",
      diagnostic: "Git unavailable",
    })
  })

  it("keeps Git reconciliation useful when external thread observation is unavailable", async () => {
    const service = new ReconciliationService({
      getRequest: async () => request,
      getRun: async () => ({
        status: "running", revision: "run-current", threadId: "thread-a", changedFiles: [], checkExecutions: [],
      }),
      observeGit: async () => ({ headCommit: "a".repeat(40), changedFiles: [], commits: [] }),
      observeThread: async () => ({ available: false, exists: false, status: "unknown" }),
      now: () => "2026-08-04T15:10:00.000Z",
    })

    await expect(service.reconcile("matriz-workbench", request.id)).resolves.toMatchObject({
      status: "current",
      threadObservation: "unavailable",
    })
  })
})
