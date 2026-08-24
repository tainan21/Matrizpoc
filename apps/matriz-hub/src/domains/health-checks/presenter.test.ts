import { describe, expect, it } from "vitest"
import type { HealthCheckRunResult } from "./domain"
import { toHealthCheckRunVM } from "./presenter"

describe("toHealthCheckRunVM", () => {
  it("exposes summary and only detailed failures to the UI", () => {
    const result: HealthCheckRunResult = {
      version: "myhub-health-check/v1",
      id: "run-1",
      kind: "apis",
      environment: "preview",
      startedAt: "2026-08-14T12:00:00.000Z",
      finishedAt: "2026-08-14T12:00:01.250Z",
      durationMs: 1_250,
      summary: { total: 2, tested: 2, ok: 1, failures: 1 },
      results: [
        {
          appId: "matriz-hub", project: "MyHub", environment: "preview",
          route: "/api/ok", url: "https://hub.example/api/ok", method: "GET",
          probeMode: "content", statusHttp: 200, success: true, durationMs: 20,
          category: null, error: null,
        },
        {
          appId: "spot", project: "Spot", environment: "preview",
          route: "/api/fail", url: "https://spot.example/api/fail", method: "GET",
          probeMode: "content", statusHttp: 503, success: false, durationMs: 30,
          category: "server_error", error: "HTTP 503",
        },
      ],
    }

    const vm = toHealthCheckRunVM(result)

    expect(vm?.kindLabel).toBe("API Check")
    expect(vm?.durationLabel).toBe("1,25 s")
    expect(vm?.failures).toHaveLength(1)
    expect(vm?.failures[0]?.categoryLabel).toBe("Erro de servidor")
  })
})
