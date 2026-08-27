import { describe, expect, it } from "vitest"
import { handleControlDiagnosticPost } from "./control-diagnostic-http"

const diagnostic = {
  projectId: "demo",
  actionId: "test",
  sessionId: "term_123",
  status: "failed",
  exitCode: 1,
  lines: ["FAIL runtime"],
  occurredAt: "2026-08-25T18:00:00.000Z",
  fingerprint: "a".repeat(64),
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://127.0.0.1:3005/api/control/diagnostics", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

describe("Control diagnostic HTTP handler", () => {
  it("accepts a bounded validated diagnostic", async () => {
    const seen: unknown[] = []
    const response = await handleControlDiagnosticPost(request(diagnostic), {
      ingest: async (input) => {
        seen.push(input)
        return {
          diagnostic: {
            id: `diag_${diagnostic.fingerprint}`,
            state: "repairing",
            occurrences: 1,
          },
        }
      },
    })

    expect(response.status).toBe(202)
    expect(response.headers.get("cache-control")).toBe("no-store")
    await expect(response.json()).resolves.toEqual({
      diagnosticId: `diag_${diagnostic.fingerprint}`,
      state: "repairing",
      occurrences: 1,
    })
    expect(seen).toHaveLength(1)
  })

  it("rejects an oversized request before reading its body", async () => {
    const response = await handleControlDiagnosticPost(
      request(diagnostic, { "content-length": String(24 * 1024 + 1) }),
      { ingest: async () => { throw new Error("must not run") } },
    )
    expect(response.status).toBe(413)
  })

  it("rejects an unsupported action and serializes internal failures generically", async () => {
    const invalid = await handleControlDiagnosticPost(request({ ...diagnostic, actionId: "deploy" }), {
      ingest: async () => { throw new Error("must not run") },
    })
    expect(invalid.status).toBe(400)

    const failed = await handleControlDiagnosticPost(request(diagnostic), {
      ingest: async () => { throw new Error("C:\\secret\\workspace") },
    })
    expect(failed.status).toBe(500)
    expect(await failed.text()).not.toContain("secret")
  })
})
