import { describe, expect, it } from "vitest"
import { WorkbenchClient } from "./workbench-client"

const capability = "w".repeat(64)

describe("Workbench loopback client", () => {
  it("reads only a compatible authenticated health response", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("http://127.0.0.1:3005/api/control/health")
      expect(init?.headers).toEqual({ authorization: `Bearer ${capability}` })
      return Response.json({
        status: "ok",
        appId: "matriz-workbench",
        contractVersion: "workbench-control-v1",
        mode: "control-desktop",
      })
    }

    const client = new WorkbenchClient({ capability, fetcher })
    await expect(client.health()).resolves.toEqual({
      status: "ok",
      appId: "matriz-workbench",
      contractVersion: "workbench-control-v1",
      mode: "control-desktop",
    })
  })

  it("rejects incompatible or malformed health responses", async () => {
    const client = new WorkbenchClient({
      capability,
      fetcher: async () => Response.json({ status: "ok", contractVersion: "other" }),
    })

    await expect(client.health()).rejects.toThrow("incompatible")
  })

  it("delivers a bounded diagnostic with the same capability", async () => {
    const diagnostic = {
      projectId: "matriz-control",
      actionId: "test" as const,
      sessionId: "term_123",
      status: "failed" as const,
      exitCode: 1,
      lines: ["FAIL runtime"],
      occurredAt: "2026-08-25T18:00:00.000Z",
      fingerprint: "a".repeat(64),
    }
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("http://127.0.0.1:3005/api/control/diagnostics")
      expect(init?.method).toBe("POST")
      expect(init?.headers).toEqual({
        authorization: `Bearer ${capability}`,
        "content-type": "application/json",
      })
      expect(JSON.parse(String(init?.body))).toEqual(diagnostic)
      return Response.json({ diagnosticId: "diag_1", state: "open", occurrences: 1 }, { status: 202 })
    }

    await expect(new WorkbenchClient({ capability, fetcher }).sendDiagnostic(diagnostic))
      .resolves.toEqual({ diagnosticId: "diag_1", state: "open", occurrences: 1 })
  })

  it("claims a pending rerun and reports its matching result", async () => {
    const calls: string[] = []
    const fetcher: typeof fetch = async (input, init) => {
      calls.push(`${init?.method ?? "GET"}:${String(input)}`)
      if (!init?.method) {
        return Response.json({
          diagnosticId: `diag_${"a".repeat(64)}`,
          projectId: "matriz-control",
          actionId: "test",
          attempt: 1,
          lease: "repair_11111111-1111-4111-8111-111111111111",
        })
      }
      expect(JSON.parse(String(init.body))).toMatchObject({ actionId: "test", attempt: 1, exitCode: 0 })
      return Response.json({ diagnosticId: `diag_${"a".repeat(64)}`, state: "resolved" })
    }
    const client = new WorkbenchClient({ capability, fetcher })

    const next = await client.nextRepair()
    await expect(client.reportRepairResult({
      ...next!,
      exitCode: 0,
      lines: ["PASS"],
    })).resolves.toMatchObject({ state: "resolved" })

    expect(calls).toEqual([
      "GET:http://127.0.0.1:3005/api/control/repairs/next",
      `POST:http://127.0.0.1:3005/api/control/repairs/diag_${"a".repeat(64)}/result`,
    ])
  })

  it("returns no repair when the Workbench queue is empty", async () => {
    const client = new WorkbenchClient({ capability, fetcher: async () => new Response(null, { status: 204 }) })
    await expect(client.nextRepair()).resolves.toBeUndefined()
  })
})
