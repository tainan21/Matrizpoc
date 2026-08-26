import { describe, expect, it } from "vitest"
import { WorkbenchRepairLoop } from "./workbench-repair-loop"

describe("WorkbenchRepairLoop", () => {
  it("runs only the leased catalog action and reports its terminal result", async () => {
    const calls: string[] = []
    const lease = {
      diagnosticId: `diag_${"a".repeat(64)}`,
      projectId: "demo",
      actionId: "test" as const,
      attempt: 1,
      lease: "repair_11111111-1111-4111-8111-111111111111",
    }
    const loop = new WorkbenchRepairLoop(
      {
        nextRepair: async () => lease,
        reportRepairResult: async (result) => { calls.push(`report:${result.exitCode}:${result.lines.join("|")}`) },
      },
      {
        start: async (projectId, actionId) => {
          calls.push(`start:${projectId}:${actionId}`)
          return { id: "term_1" }
        },
        waitForExit: async () => ({ exitCode: 0, lines: ["PASS"], error: null }),
      },
    )

    await loop.runOnce()

    expect(calls).toEqual(["start:demo:test", "report:0:PASS"])
  })

  it("does not overlap queue claims", async () => {
    let claims = 0
    let release!: () => void
    const blocked = new Promise<void>((resolve) => { release = resolve })
    const loop = new WorkbenchRepairLoop(
      { nextRepair: async () => { claims += 1; await blocked; return undefined }, reportRepairResult: async () => undefined },
      { start: async () => ({ id: "term_1" }), waitForExit: async () => ({ exitCode: 0, lines: [], error: null }) },
    )
    const first = loop.runOnce()
    const second = loop.runOnce()
    release()
    await Promise.all([first, second])
    expect(claims).toBe(1)
  })
})
