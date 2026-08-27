import { describe, expect, it, vi } from "vitest"
import { GET } from "./route"

describe("GET /api/apps/readiness", () => {
  it("returns readiness for an allowlisted app without accepting a browser URL", async () => {
    const originalFetch = global.fetch
    const fetchCalls: string[] = []
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      fetchCalls.push(typeof input === "string" ? input : input instanceof URL ? input.href : input.url)
      return new Response(null, { status: 204 })
    }) as typeof fetch

    try {
      const response = await GET(new Request("http://localhost:3009/api/apps/readiness?appId=health&url=http://evil.test"))

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ appId: "health", ready: true })
      expect(fetchCalls).toEqual(["http://127.0.0.1:3010"])
    } finally {
      global.fetch = originalFetch
    }
  })

  it("rejects unknown identifiers before making a network request", async () => {
    const originalFetch = global.fetch
    global.fetch = vi.fn() as typeof fetch

    try {
      const response = await GET(new Request("http://localhost:3009/api/apps/readiness?appId=https://evil.test"))

      expect(response.status).toBe(404)
      expect(global.fetch).not.toHaveBeenCalled()
    } finally {
      global.fetch = originalFetch
    }
  })

  it("returns not ready when the server-side health check exceeds its deadline", async () => {
    vi.useFakeTimers()
    const originalFetch = global.fetch
    global.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
    })) as typeof fetch

    try {
      const responsePromise = GET(new Request("http://localhost:3009/api/apps/readiness?appId=health"))
      await vi.advanceTimersByTimeAsync(750)

      const response = await responsePromise
      await expect(response.json()).resolves.toEqual({ appId: "health", ready: false })
    } finally {
      global.fetch = originalFetch
      vi.useRealTimers()
    }
  })
})
