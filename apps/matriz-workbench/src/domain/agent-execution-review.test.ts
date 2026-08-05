import { describe, expect, it } from "vitest"
import type { AgentRequest } from "./schemas"
import { buildAgentExecutionReview } from "./agent-execution-review"

function request(patch: Partial<AgentRequest> = {}): AgentRequest {
  return {
    schemaVersion: 1,
    id: "req_00000000-0000-4000-8000-000000000001",
    projectId: "sample",
    backlogItemId: "wi_00000000-0000-4000-8000-000000000001",
    title: "Entrega",
    instructions: "",
    status: "completed",
    resultSummary: "Implementação verificada.",
    changedFiles: ["apps/sample/src/example.ts"],
    checks: ["pnpm test"],
    createdAt: "2026-08-03T10:00:00.000Z",
    updatedAt: "2026-08-03T11:00:00.000Z",
    revision: "revision-1",
    ...patch,
  }
}

describe("agent execution review", () => {
  it("keeps approval human and evidence based", () => {
    expect(() => buildAgentExecutionReview(request(), {
      status: "approved",
      reviewedBy: "Zara",
    }, "codex")).toThrow(/Somente uma pessoa/)
    expect(() => buildAgentExecutionReview(request({ checks: [] }), {
      status: "approved",
      reviewedBy: "Zara",
    }, "human")).toThrow(/verificação/)
  })

  it("requires a note when changes are requested", () => {
    expect(() => buildAgentExecutionReview(request(), {
      status: "changes_requested",
      reviewedBy: "Zara",
    }, "human")).toThrow(/justificativa/)
  })

  it("records the reviewed run without changing request status", () => {
    expect(buildAgentExecutionReview(request(), {
      status: "approved",
      reviewedBy: "Zara",
      note: "Diff e checks revisados.",
      runRevision: "run-revision-1",
    }, "human", "2026-08-03T12:00:00.000Z")).toEqual({
      status: "approved",
      reviewedBy: "Zara",
      reviewedAt: "2026-08-03T12:00:00.000Z",
      note: "Diff e checks revisados.",
      runRevision: "run-revision-1",
    })
  })
})
