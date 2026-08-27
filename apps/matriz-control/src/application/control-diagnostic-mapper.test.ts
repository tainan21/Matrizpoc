import { describe, expect, it } from "vitest"
import type { TerminalSession } from "../domain/terminal"
import { toControlDiagnostic } from "./control-diagnostic-mapper"

const failed: TerminalSession = {
  id: "term_123",
  projectId: "matriz-control",
  projectName: "Matriz Control",
  actionId: "test",
  label: "Testes",
  route: "mih/apps/matriz-control",
  port: null,
  status: "exited",
  pid: 42,
  lines: ["\u001b[31mFAIL\u001b[0m runtime", "API_KEY=super-secret", "C:\\Apps\\matriz-infra-hub\\apps\\matriz-control\\src\\runtime.ts"],
  startedAt: "2026-08-25T18:00:00.000Z",
  exitCode: 1,
  error: null,
}

describe("Control diagnostic mapper", () => {
  it("maps a failed declared action to bounded redacted evidence", () => {
    expect(toControlDiagnostic(failed)).toEqual({
      projectId: "matriz-control",
      actionId: "test",
      sessionId: "term_123",
      status: "exited",
      exitCode: 1,
      lines: ["FAIL runtime", "API_KEY=[redacted]", "mih/apps/matriz-control/src/runtime.ts"],
      occurredAt: "2026-08-25T18:00:00.000Z",
      fingerprint: "207b3ad4eeb129775643c5dd475738e89cfb50abf8ae5cf666c09521eeb29def",
    })
  })

  it("does not report successful, running, or intentionally stopping sessions", () => {
    expect(toControlDiagnostic({ ...failed, exitCode: 0 })).toBeUndefined()
    expect(toControlDiagnostic({ ...failed, status: "running", exitCode: null })).toBeUndefined()
    expect(toControlDiagnostic({ ...failed, status: "stopping", exitCode: null })).toBeUndefined()
  })

  it("keeps only the last 80 non-empty evidence lines", () => {
    const result = toControlDiagnostic({ ...failed, lines: Array.from({ length: 90 }, (_, index) => `line ${index}`) })
    expect(result?.lines).toHaveLength(80)
    expect(result?.lines[0]).toBe("line 10")
    expect(result?.lines.at(-1)).toBe("line 89")
  })
})
