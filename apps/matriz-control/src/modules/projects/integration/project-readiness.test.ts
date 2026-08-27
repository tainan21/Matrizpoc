import { describe, expect, it } from "vitest"
import { ProjectReadinessProbe, assertExpectedPortsAvailable } from "./project-readiness"

describe("ProjectReadinessProbe", () => {
  it("reports ready only after an approved exact-loopback HTTP response", async () => {
    const urls: string[] = []
    const probe = new ProjectReadinessProbe({ fetch: async (url) => { urls.push(url); return { ok: true } }, delay: async () => undefined, now: (() => { let value = 0; return () => value += 10 })() })
    await expect(probe.wait({ kind: "http", path: "/health", timeoutMs: 100 }, 4100, () => true)).resolves.toEqual({ state: "ready", url: "http://127.0.0.1:4100/health" })
    expect(urls).toEqual(["http://127.0.0.1:4100/health"])
  })

  it("reports early exit and timeout honestly", async () => {
    const exited = new ProjectReadinessProbe({ fetch: async () => { throw new Error("not ready") }, delay: async () => undefined, now: () => 0 })
    await expect(exited.wait({ kind: "http", path: "/", timeoutMs: 100 }, 4100, () => false)).resolves.toEqual({ state: "failed", reason: "process-exited" })
    let now = 0
    const timeout = new ProjectReadinessProbe({ fetch: async () => { throw new Error("not ready") }, delay: async () => { now += 60 }, now: () => now })
    await expect(timeout.wait({ kind: "http", path: "/", timeoutMs: 100 }, 4100, () => true)).resolves.toEqual({ state: "degraded", reason: "readiness-timeout" })
  })

  it("rejects invalid health paths and foreign listeners", async () => {
    const probe = new ProjectReadinessProbe({ fetch: async () => ({ ok: true }), delay: async () => undefined, now: () => 0 })
    await expect(probe.wait({ kind: "http", path: "https://evil.test", timeoutMs: 100 }, 4100, () => true)).rejects.toThrow("Invalid readiness path")
    await expect(assertExpectedPortsAvailable([4100], async () => false)).rejects.toThrow("Expected port 4100 is already occupied by an external process")
  })
})
