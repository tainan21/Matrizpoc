import { describe, expect, it } from "vitest"
import { EngineeringOperationService } from "./engineering-operation-service"

describe("EngineeringOperationService", () => {
  it("uses the observed Git baseline instead of accepting one from the caller", async () => {
    const calls: unknown[] = []
    const service = new EngineeringOperationService({
      claimAgentRequest: async (...args: unknown[]) => {
        calls.push(args)
        return { id: "req_1", executionClaim: (args[2] as { baseCommit: string; dirtyPaths: string[] }) }
      },
    } as never, {
      observeCurrent: async () => ({
        headCommit: "a".repeat(40),
        dirtyPaths: ["AGENTS.md"],
      }),
    }, () => "2026-08-04T15:00:00.000Z")

    const result = await service.claim({
      projectId: "matriz-workbench",
      requestId: "req_00000000-0000-4000-8000-000000000001",
      revision: "request-revision",
      claimedBy: "codex:thread-a",
      executionMode: "change",
      intendedFiles: ["apps/matriz-workbench/src/domain/schemas.ts"],
      intendedSurfaces: ["workbench-agent-lifecycle"],
      plannedChecks: ["pnpm test"],
      leaseMinutes: 30,
    })

    expect(result.executionClaim).toMatchObject({
      baseCommit: "a".repeat(40),
      dirtyPaths: ["AGENTS.md"],
    })
    expect(calls).toHaveLength(1)
  })

  it("rejects a lease duration outside the bounded policy", async () => {
    const service = new EngineeringOperationService({} as never, {
      observeCurrent: async () => ({ headCommit: "a".repeat(40), dirtyPaths: [] }),
    })
    await expect(service.claim({
      projectId: "matriz-workbench",
      requestId: "req_00000000-0000-4000-8000-000000000001",
      revision: "request-revision",
      claimedBy: "codex:thread-a",
      executionMode: "change",
      intendedFiles: ["apps/matriz-workbench/src/domain/schemas.ts"],
      intendedSurfaces: [],
      plannedChecks: ["pnpm test"],
      leaseMinutes: 240,
    })).rejects.toMatchObject({ code: "INVALID_DATA" })
  })
})
