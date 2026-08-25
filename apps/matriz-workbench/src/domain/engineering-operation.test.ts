import { describe, expect, it } from "vitest"
import {
  assertExecutionResult,
  buildExecutionClaim,
  findOwnershipConflicts,
  renewExecutionLease,
} from "./engineering-operation"

describe("engineering operation", () => {
  it("rejects a claim whose intended files overlap another live claim", () => {
    const current = buildExecutionClaim({
      requestId: "req_11111111-1111-4111-8111-111111111111",
      claimedBy: "codex:thread-a",
      executionMode: "change",
      intendedFiles: ["apps/matriz-workbench/src/domain"],
      intendedSurfaces: ["workbench-agent-lifecycle"],
      plannedChecks: ["pnpm --filter @matriz/app-matriz-workbench test"],
      baseCommit: "a".repeat(40),
      dirtyPaths: [],
      acquiredAt: "2026-08-04T15:00:00.000Z",
      expiresAt: "2026-08-04T15:30:00.000Z",
    })
    const candidate = buildExecutionClaim({
      requestId: "req_22222222-2222-4222-8222-222222222222",
      claimedBy: "codex:thread-b",
      executionMode: "change",
      intendedFiles: ["apps/matriz-workbench/src/domain/schemas.ts"],
      intendedSurfaces: [],
      plannedChecks: ["pnpm --filter @matriz/app-matriz-workbench typecheck"],
      baseCommit: "a".repeat(40),
      dirtyPaths: [],
      acquiredAt: "2026-08-04T15:05:00.000Z",
      expiresAt: "2026-08-04T15:35:00.000Z",
    })

    expect(findOwnershipConflicts(candidate, [current], "2026-08-04T15:10:00.000Z"))
      .toEqual([{
        requestId: current.requestId,
        kind: "file",
        value: "apps/matriz-workbench/src/domain/schemas.ts",
      }])
  })

  it("does not treat an expired lease as an active ownership conflict", () => {
    const expired = buildExecutionClaim({
      requestId: "req_11111111-1111-4111-8111-111111111111",
      claimedBy: "codex:thread-a",
      executionMode: "change",
      intendedFiles: ["apps/matriz-workbench/src/domain/schemas.ts"],
      intendedSurfaces: [],
      plannedChecks: ["pnpm --filter @matriz/app-matriz-workbench test"],
      baseCommit: "a".repeat(40),
      dirtyPaths: [],
      acquiredAt: "2026-08-04T14:00:00.000Z",
      expiresAt: "2026-08-04T14:30:00.000Z",
    })
    const candidate = buildExecutionClaim({
      requestId: "req_22222222-2222-4222-8222-222222222222",
      claimedBy: "codex:thread-b",
      executionMode: "change",
      intendedFiles: ["apps/matriz-workbench/src/domain/schemas.ts"],
      intendedSurfaces: [],
      plannedChecks: ["pnpm --filter @matriz/app-matriz-workbench typecheck"],
      baseCommit: "a".repeat(40),
      dirtyPaths: [],
      acquiredAt: "2026-08-04T15:05:00.000Z",
      expiresAt: "2026-08-04T15:35:00.000Z",
    })

    expect(findOwnershipConflicts(candidate, [expired], "2026-08-04T15:10:00.000Z"))
      .toEqual([])
  })

  it("renews only the current lease generation", () => {
    const claim = buildExecutionClaim({
      requestId: "req_11111111-1111-4111-8111-111111111111",
      claimedBy: "codex:thread-a",
      executionMode: "change",
      intendedFiles: ["apps/matriz-workbench/src/domain/schemas.ts"],
      intendedSurfaces: [],
      plannedChecks: ["pnpm --filter @matriz/app-matriz-workbench test"],
      baseCommit: "a".repeat(40),
      dirtyPaths: [],
      acquiredAt: "2026-08-04T15:00:00.000Z",
      expiresAt: "2026-08-04T15:30:00.000Z",
    })

    expect(() => renewExecutionLease(claim, 2, "2026-08-04T15:10:00.000Z", "2026-08-04T15:40:00.000Z"))
      .toThrow("geração")
    expect(renewExecutionLease(claim, 1, "2026-08-04T15:10:00.000Z", "2026-08-04T15:40:00.000Z").lease)
      .toMatchObject({ generation: 2, renewedAt: "2026-08-04T15:10:00.000Z" })
    expect(() => renewExecutionLease(
      claim,
      1,
      "2026-08-04T15:30:00.000Z",
      "2026-08-04T16:00:00.000Z",
    )).toThrow("expirada")
  })

  it("requires plan-only completion to report no files and no executed checks", () => {
    expect(() => assertExecutionResult({
      executionMode: "plan_only",
      resultSummary: "Plano entregue.",
      changedFiles: ["docs/plan.md"],
      executedChecks: [],
    })).toThrow("plan-only")
    expect(() => assertExecutionResult({
      executionMode: "plan_only",
      resultSummary: "Plano entregue.",
      changedFiles: [],
      executedChecks: [],
    })).not.toThrow()
  })

  it("requires a change execution to include an observed check result", () => {
    expect(() => assertExecutionResult({
      executionMode: "change",
      resultSummary: "Contrato implementado.",
      changedFiles: ["apps/matriz-workbench/src/domain/engineering-operation.ts"],
      executedChecks: [],
    })).toThrow("verificação executada")
  })

  it("rejects blank scope and planned checks after normalization", () => {
    expect(() => buildExecutionClaim({
      requestId: "req_11111111-1111-4111-8111-111111111111",
      claimedBy: "codex:thread-a",
      executionMode: "change",
      intendedFiles: [],
      intendedSurfaces: ["   "],
      plannedChecks: ["   "],
      baseCommit: "a".repeat(40),
      dirtyPaths: [],
      acquiredAt: "2026-08-04T15:00:00.000Z",
      expiresAt: "2026-08-04T15:30:00.000Z",
    })).toThrow("arquivo ou superfície")
  })
})
