import { describe, expect, it, vi } from "vitest"
import { executeHealthCheck, type HealthCheckApplicationDependencies } from "./application"

function dependencies(): HealthCheckApplicationDependencies {
  return {
    workspaceRoot: "C:/workspace",
    apps: [{
      appId: "matriz-hub",
      name: "MyHub",
      baseUrl: "http://localhost:3000",
      routes: ["/health"],
    }],
    profiles: [{
      name: "development",
      baseUrls: { "matriz-hub": "http://localhost:3000" },
    }],
    repository: {
      save: vi.fn(async () => undefined),
      getLatest: vi.fn(async () => null),
    },
    fetcher: vi.fn<typeof fetch>(async () => new Response("ok", { status: 200 })),
  }
}

describe("executeHealthCheck", () => {
  it("rejects an environment outside the configured allowlist", async () => {
    await expect(executeHealthCheck("routes", "unknown", dependencies()))
      .rejects.toThrow("Ambiente não configurado")
  })

  it("returns the completed result with a warning when persistence is unavailable", async () => {
    const deps = dependencies()
    deps.repository.save = vi.fn(async () => {
      throw new Error("read-only filesystem")
    })

    const result = await executeHealthCheck("routes", "development", deps)

    expect(result.summary).toEqual({ total: 1, tested: 1, ok: 1, failures: 0 })
    expect(result.persistenceWarning).toContain("read-only filesystem")
  })
})
