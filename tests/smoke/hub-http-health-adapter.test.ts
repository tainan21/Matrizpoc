import { describe, expect, it } from "vitest"
import { checkHttpEnvironment } from "../../apps/matriz-hub/src/institutional/integration/health/http-health-adapter"

describe("Hub HTTP health adapter", () => {
  it("records an available environment after a successful observed response", async () => {
    const environment = await checkHttpEnvironment({
      id: "local",
      kind: "local",
      label: "Local",
      url: "http://127.0.0.1:3001",
      now: new Date("2026-08-04T12:00:00.000Z"),
      fetch: async (_url, init) => {
        expect(init?.redirect).toBe("manual")
        return new Response(null, { status: 204 })
      },
    })

    expect(environment).toMatchObject({
      status: "available",
      observation: {
        nature: "observed",
        freshness: "fresh",
        confidence: "verified",
        observedAt: "2026-08-04T12:00:00.000Z",
      },
    })
  })

  it("returns unknown with the collection error when transport fails", async () => {
    const environment = await checkHttpEnvironment({
      id: "local",
      kind: "local",
      label: "Local",
      url: "http://127.0.0.1:3001",
      now: new Date("2026-08-04T12:00:00.000Z"),
      fetch: async () => {
        throw new Error("connection refused")
      },
    })

    expect(environment).toMatchObject({
      status: "unknown",
      observation: {
        nature: "observed",
        freshness: "unknown",
        confidence: "verified",
        lastError: { code: "http_check_failed", message: "connection refused" },
      },
    })
  })
})
