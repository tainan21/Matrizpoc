import { describe, expect, it } from "vitest"

import { ACCEPTANCE_CASES } from "./catalog"
import type { AcceptanceResult, AcceptanceStatus } from "./results"
import { summarizeAcceptance } from "./results"

function completePackagedRun(runId: string, status: AcceptanceStatus = "pass") {
  return ACCEPTANCE_CASES.map<AcceptanceResult>((item) => ({
    schemaVersion: "v1",
    runId,
    id: item.id,
    target: "packaged-candidate",
    status,
    startedAt: "2026-08-20T12:00:00.000Z",
    durationMs: 10,
    commit: "abc1234",
    artifactSha256: "a".repeat(64),
    summary: `${item.id} ${status}`,
    evidence: [],
  }))
}

function override(
  results: readonly AcceptanceResult[],
  id: string,
  status: AcceptanceStatus,
): readonly AcceptanceResult[] {
  return results.map((result) => (result.id === id ? { ...result, status } : result))
}

describe("acceptance verdict", () => {
  it("is ready only after two complete packaged candidate runs", () => {
    const summary = summarizeAcceptance([
      ...completePackagedRun("final-1"),
      ...completePackagedRun("final-2"),
    ])

    expect(summary.verdict).toBe("ready")
    expect(summary.unresolved).toEqual([])
    expect(summary.packagedRunCount).toBe(2)
  })

  it("is not ready when only one complete packaged run exists", () => {
    const summary = summarizeAcceptance(completePackagedRun("final-1"))

    expect(summary.verdict).toBe("not-ready")
    expect(summary.packagedRunCount).toBe(1)
  })

  it("is not ready when a required result fails", () => {
    const summary = summarizeAcceptance([
      ...completePackagedRun("final-1"),
      ...override(completePackagedRun("final-2"), "TERM-010", "fail"),
    ])

    expect(summary.verdict).toBe("not-ready")
    expect(summary.unresolved).toContainEqual({ id: "TERM-010", status: "fail" })
  })

  it("is blocked when a required result is externally blocked", () => {
    const summary = summarizeAcceptance([
      ...completePackagedRun("final-1"),
      ...override(completePackagedRun("final-2"), "INST-003", "blocked"),
    ])

    expect(summary.verdict).toBe("blocked")
    expect(summary.unresolved).toContainEqual({ id: "INST-003", status: "blocked" })
  })

  it("ignores historical and source targets when certifying the package", () => {
    const sourceOnly = completePackagedRun("source").map<AcceptanceResult>((result) => ({
      ...result,
      target: "source-runtime",
    }))

    expect(summarizeAcceptance(sourceOnly).verdict).toBe("not-ready")
    expect(summarizeAcceptance(sourceOnly).packagedRunCount).toBe(0)
  })
})
