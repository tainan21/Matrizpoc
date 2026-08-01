import { afterEach, describe, expect, it } from "vitest"
import { CodexRunManager } from "./codex-run-manager"

const originalLimit = process.env.WORKBENCH_MAX_CONCURRENT_CODEX_RUNS

afterEach(() => {
  if (originalLimit === undefined) delete process.env.WORKBENCH_MAX_CONCURRENT_CODEX_RUNS
  else process.env.WORKBENCH_MAX_CONCURRENT_CODEX_RUNS = originalLimit
})

describe("CodexRunManager concurrency", () => {
  it("rejects a start before filesystem/runtime work when the local cap is full", async () => {
    process.env.WORKBENCH_MAX_CONCURRENT_CODEX_RUNS = "1"
    const manager = new CodexRunManager()
    const internal = manager as unknown as {
      sessions: Map<string, { connected: boolean }>
    }
    internal.sessions.set("sample:req_existing", { connected: true })

    await expect(manager.start(
      "sample",
      "req_11111111-1111-4111-8111-111111111111",
      "revision-1",
    )).rejects.toMatchObject({ code: "RATE_LIMITED" })
  })
})
