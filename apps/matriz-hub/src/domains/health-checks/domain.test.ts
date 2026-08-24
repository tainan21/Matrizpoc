import { describe, expect, it, vi } from "vitest"
import {
  classifyHealthFailure,
  runHealthCheck,
  type HealthCheckTarget,
} from "./domain"

function target(route: string): HealthCheckTarget {
  return {
    appId: "matriz-hub",
    project: "MyHub",
    environment: "development",
    route,
    url: `http://localhost:3000${route}`,
    method: "GET",
    probeMode: "content",
  }
}

describe("runHealthCheck", () => {
  it("tests every target and consolidates failures without fail-fast", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("ok", { status: 200 }))
      .mockResolvedValueOnce(new Response("error", { status: 503 }))
      .mockRejectedValueOnce(new TypeError("connection refused"))

    const result = await runHealthCheck({
      kind: "routes",
      environment: "development",
      targets: [target("/one"), target("/two"), target("/three")],
      fetcher,
      concurrency: 2,
      timeoutMs: 100,
    })

    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(result.summary).toEqual({ total: 3, tested: 3, ok: 1, failures: 2 })
    expect(result.results.map((item) => item.category)).toEqual([
      null,
      "server_error",
      "network_error",
    ])
  })

  it("aborts a slow request and reports a timeout", async () => {
    const fetcher = vi.fn<typeof fetch>((_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        )
      }),
    )

    const result = await runHealthCheck({
      kind: "routes",
      environment: "development",
      targets: [target("/slow")],
      fetcher,
      timeoutMs: 5,
    })

    expect(result.results[0]?.category).toBe("timeout")
    expect(result.summary.failures).toBe(1)
  })
})

describe("classifyHealthFailure", () => {
  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "endpoint_not_found"],
    [405, "method_not_allowed"],
    [500, "server_error"],
    [418, "unexpected_response"],
  ] as const)("classifies HTTP %s as %s", (status, category) => {
    expect(classifyHealthFailure(status)).toBe(category)
  })
})
