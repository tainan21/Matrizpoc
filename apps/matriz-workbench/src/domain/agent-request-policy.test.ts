import { describe, expect, it } from "vitest"
import type { AgentRequest } from "./schemas"
import { assertAgentRequestCompletion, assertAgentRequestTransition } from "./agent-request-policy"

function request(mode: "plan_only" | "change"): AgentRequest {
  return {
    schemaVersion: 1,
    id: "req_00000000-0000-4000-8000-000000000001",
    projectId: "matriz-workbench",
    backlogItemId: "wi_00000000-0000-4000-8000-000000000001",
    title: "Engineering operation",
    instructions: "",
    status: "in_progress",
    claimedBy: "codex:thread-a",
    changedFiles: [],
    checks: [],
    executionClaim: {
      requestId: "req_00000000-0000-4000-8000-000000000001",
      claimedBy: "codex:thread-a",
      executionMode: mode,
      intendedFiles: mode === "change" ? ["apps/matriz-workbench/src/domain/schemas.ts"] : [],
      intendedSurfaces: [],
      plannedChecks: mode === "change" ? ["pnpm --filter @matriz/app-matriz-workbench test"] : [],
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
    revision: "revision-1",
  }
}

describe("agent request completion policy", () => {
  it("allows an explicitly claimed plan-only request to finish without invented checks", () => {
    expect(() => assertAgentRequestCompletion(request("plan_only"), {
      resultSummary: "Plano factual entregue.",
      changedFiles: [],
      checks: [],
    })).not.toThrow()
  })

  it("still requires an executed check for a change request", () => {
    expect(() => assertAgentRequestCompletion(request("change"), {
      resultSummary: "Código alterado.",
      changedFiles: ["apps/matriz-workbench/src/domain/schemas.ts"],
      checks: [],
    })).toThrow("verificação executada")
  })

  it("keeps interruption recoverable and distinct from blocking or cancellation", () => {
    const running = request("change")
    expect(() => assertAgentRequestTransition(running, "interrupted")).not.toThrow()
    expect(() => assertAgentRequestTransition({ ...running, status: "interrupted" }, "claimed"))
      .not.toThrow()
  })
})
