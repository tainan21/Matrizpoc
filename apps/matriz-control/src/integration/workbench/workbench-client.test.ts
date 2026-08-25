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
})
