import { describe, expect, it } from "vitest"
import { buildControlHealth, controlDiagnosticSchema } from "./control-contract"

const valid = {
  projectId: "matriz-control",
  actionId: "test",
  sessionId: "term_123",
  status: "failed",
  exitCode: 1,
  lines: ["FAIL src/application/runtime.test.ts"],
  occurredAt: "2026-08-25T18:00:00.000Z",
  fingerprint: "a".repeat(64),
}

describe("Control diagnostic contract", () => {
  it("publishes a bounded compatible health response", () => {
    expect(buildControlHealth("control-desktop")).toEqual({
      status: "ok",
      appId: "matriz-workbench",
      contractVersion: "workbench-control-v1",
      mode: "control-desktop",
    })
  })

  it("accepts bounded evidence for a declared action", () => {
    expect(controlDiagnosticSchema.parse(valid)).toEqual(valid)
  })

  it("rejects arbitrary actions, excessive output, paths, and malformed fingerprints", () => {
    expect(controlDiagnosticSchema.safeParse({ ...valid, actionId: "rm" }).success).toBe(false)
    expect(controlDiagnosticSchema.safeParse({ ...valid, lines: Array(81).fill("line") }).success).toBe(false)
    expect(controlDiagnosticSchema.safeParse({ ...valid, projectId: "../secret" }).success).toBe(false)
    expect(controlDiagnosticSchema.safeParse({ ...valid, fingerprint: "short" }).success).toBe(false)
  })

  it("caps total evidence size even when each line is individually valid", () => {
    expect(controlDiagnosticSchema.safeParse({
      ...valid,
      lines: Array(80).fill("x".repeat(300)),
    }).success).toBe(false)
  })
})
