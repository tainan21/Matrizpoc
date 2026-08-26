import { describe, expect, it } from "vitest"
import { WorkspaceError } from "../domain/errors"
import { handleControlRepairNext, handleControlRepairResult } from "./control-repair-http"

describe("Control repair HTTP handlers", () => {
  it("returns no content for an empty queue and one bounded lease otherwise", async () => {
    expect((await handleControlRepairNext({ next: async () => undefined })).status).toBe(204)
    const response = await handleControlRepairNext({
      next: async () => ({
        diagnosticId: `diag_${"a".repeat(64)}`,
        projectId: "demo",
        actionId: "test",
        attempt: 1,
        lease: "repair_11111111-1111-4111-8111-111111111111",
      }),
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ projectId: "demo", actionId: "test" })
  })

  it("validates the result body and maps lease conflicts without leaking details", async () => {
    const invalid = await handleControlRepairResult(
      new Request("http://127.0.0.1", { method: "POST", body: JSON.stringify({ actionId: "deploy" }) }),
      `diag_${"a".repeat(64)}`,
      { result: async () => { throw new Error("must not run") } },
    )
    expect(invalid.status).toBe(400)

    const conflict = await handleControlRepairResult(
      new Request("http://127.0.0.1", {
        method: "POST",
        body: JSON.stringify({
          actionId: "test",
          attempt: 1,
          lease: "repair_11111111-1111-4111-8111-111111111111",
          exitCode: 0,
          lines: ["PASS"],
        }),
      }),
      `diag_${"a".repeat(64)}`,
      { result: async () => { throw new WorkspaceError("private lease", "CONFLICT") } },
    )
    expect(conflict.status).toBe(409)
    expect(await conflict.text()).not.toContain("private")
  })
})
