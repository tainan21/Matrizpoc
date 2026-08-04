import { describe, expect, it } from "vitest"
import {
  buildCheckExecution,
  buildExecutionAttempt,
  finishExecutionAttempt,
  isCheckExpired,
  recordCheckResult,
} from "./execution-evidence"

describe("execution attempts and evidence", () => {
  it("records interruption as a terminal attempt distinct from failure", () => {
    const running = buildExecutionAttempt({
      id: "attempt_00000000-0000-4000-8000-000000000001",
      requestId: "req_00000000-0000-4000-8000-000000000001",
      hostId: "local",
      threadId: "thread-a",
      turnId: "turn-a",
      startedAt: "2026-08-04T15:00:00.000Z",
    })

    const interrupted = finishExecutionAttempt(
      running,
      "interrupted",
      "2026-08-04T15:05:00.000Z",
      "Interrompida pelo usuário.",
    )
    expect(interrupted).toMatchObject({ status: "interrupted", error: "Interrompida pelo usuário." })
    expect(() => finishExecutionAttempt(interrupted, "completed", "2026-08-04T15:06:00.000Z"))
      .toThrow("terminal")
  })

  it("distinguishes a planned check from an observed passing result", () => {
    const planned = buildCheckExecution({
      id: "check_00000000-0000-4000-8000-000000000001",
      name: "Workbench tests",
      command: "pnpm --filter @matriz/app-matriz-workbench test",
      source: "app_server",
      baseCommit: "a".repeat(40),
    })
    expect(planned.state).toBe("planned")

    const passed = recordCheckResult(planned, {
      startedAt: "2026-08-04T15:00:00.000Z",
      finishedAt: "2026-08-04T15:02:00.000Z",
      exitCode: 0,
      output: "179 tests passed",
      headCommit: "a".repeat(40),
    })
    expect(passed).toMatchObject({ state: "passed", exitCode: 0, outputExcerpt: "179 tests passed" })
    expect(passed.outputDigest).toMatch(/^[0-9a-f]{64}$/)
  })

  it("marks a passing check stale when the observed head changes", () => {
    const passed = recordCheckResult(buildCheckExecution({
      id: "check_00000000-0000-4000-8000-000000000001",
      name: "Typecheck",
      command: "pnpm --filter @matriz/app-matriz-workbench typecheck",
      source: "codex_report",
      baseCommit: "a".repeat(40),
    }), {
      startedAt: "2026-08-04T15:00:00.000Z",
      finishedAt: "2026-08-04T15:01:00.000Z",
      exitCode: 0,
      output: "",
      headCommit: "a".repeat(40),
    })

    expect(isCheckExpired(passed, "b".repeat(40))).toBe(true)
    expect(isCheckExpired(passed, "a".repeat(40))).toBe(false)
  })

  it("derives failure from an observed non-zero exit code", () => {
    const failed = recordCheckResult(buildCheckExecution({
      id: "check_00000000-0000-4000-8000-000000000001",
      name: "Lint",
      command: "pnpm --filter @matriz/app-matriz-workbench lint",
      source: "ci",
      baseCommit: "a".repeat(40),
    }), {
      startedAt: "2026-08-04T15:00:00.000Z",
      finishedAt: "2026-08-04T15:01:00.000Z",
      exitCode: 1,
      output: "one error",
      headCommit: "a".repeat(40),
    })

    expect(failed.state).toBe("failed")
  })
})
