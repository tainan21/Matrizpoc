import { createServer } from "node:http"
import { describe, expect, it, vi } from "vitest"
import { waitForHealth } from "./health-check"

describe("health readiness", () => {
  it("returns the validated health payload", async () => {
    const server = createServer((_request, response) => {
      response.setHeader("content-type", "application/json")
      response.end(JSON.stringify({ status: "ok", appId: "spot", contractVersion: "v1" }))
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Missing address")

    await expect(waitForHealth({
      url: `http://127.0.0.1:${address.port}/api/health`,
      expectedAppId: "spot",
      timeoutMs: 1_000,
      intervalMs: 10,
    })).resolves.toMatchObject({ status: "ok", appId: "spot" })

    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  })

  it("times out when the endpoint is unavailable", async () => {
    await expect(waitForHealth({
      url: "http://127.0.0.1:1/api/health",
      expectedAppId: "spot",
      timeoutMs: 30,
      intervalMs: 5,
    })).rejects.toThrow("Health check timed out")
  })

  it("aborts an individual stalled request before the overall deadline", async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))
    }))

    await expect(waitForHealth({
      url: "http://127.0.0.1:3001/api/health",
      expectedAppId: "spot",
      timeoutMs: 40,
      intervalMs: 5,
      requestTimeoutMs: 10,
      fetchImpl,
    })).rejects.toThrow("Health check timed out")
    expect(fetchImpl).toHaveBeenCalled()
  })
})
