import { describe, expect, it, vi } from "vitest"
import { WindowsLocalDevelopmentSeedHost } from "./windows-local-development-seed-host"

describe("WindowsLocalDevelopmentSeedHost", () => {
  it("checks the owned stack, migration ledgers and workspace before seeding", async () => {
    const host = new WindowsLocalDevelopmentSeedHost({
      workspaceRoot: "C:/repo",
      resolveEnvironment: async () => ({ values: {}, redactions: [] }),
      infrastructureStatus: async () => ({ services: [{ state: "healthy" }, { state: "healthy" }, { state: "healthy" }] }),
      migrationStatus: async () => Array.from({ length: 8 }, () => ({ state: "clean" })),
      fileExists: async (path) => path.endsWith("package.json"),
      execute: async () => undefined,
    })
    await expect(host.prerequisites()).resolves.toEqual({ servicesHealthy: true, migrationsClean: true, workspaceAvailable: true })
  })

  it("runs both idempotent seeds with an aggregate in-memory environment", async () => {
    const execute = vi.fn(async () => undefined)
    const resolveEnvironment = vi.fn(async () => ({
      values: {
        MATRIZ_RUNTIME_PROFILE: "local",
        CORE_RUNTIME_DATABASE_URL: "postgresql://core:secret@127.0.0.1:55432/matriz?schema=core",
        HUB_DATABASE_URL: "postgresql://hub:secret@127.0.0.1:55432/matriz?schema=hub",
      },
      redactions: ["secret"],
    }))
    const host = new WindowsLocalDevelopmentSeedHost({
      workspaceRoot: "C:/repo",
      resolveEnvironment,
      infrastructureStatus: async () => ({ services: [] }),
      migrationStatus: async () => [],
      fileExists: async () => true,
      execute,
    })

    await host.execute()

    expect(resolveEnvironment).toHaveBeenCalledWith([
      "C:\\repo\\apps\\matriz-identity",
      "C:\\repo\\apps\\matriz-hub",
      "C:\\repo\\apps\\spot",
      "C:\\repo\\apps\\seumeiapp",
      "C:\\repo\\apps\\contracts",
      "C:\\repo\\apps\\willdash",
      "C:\\repo\\apps\\matriz-ops",
      "C:\\repo\\apps\\matriz-pay",
    ])
    const expectedEnvironment = expect.objectContaining({
      MATRIZ_ENVIRONMENT: "local",
      MATRIZ_RUNTIME_PROFILE: "local",
      CORE_DATABASE_URL: "postgresql://core:secret@127.0.0.1:55432/matriz?schema=core",
      HUB_DATABASE_URL: "postgresql://hub:secret@127.0.0.1:55432/matriz?schema=hub",
    })
    expect(execute).toHaveBeenNthCalledWith(1, "corepack.cmd", ["pnpm", "matriz:seed:dev"], { cwd: "C:/repo", environment: expectedEnvironment, redactions: ["secret"] })
    expect(execute).toHaveBeenNthCalledWith(2, "corepack.cmd", ["pnpm", "--filter", "@matriz/app-matriz-identity", "seed:local"], { cwd: "C:/repo", environment: expectedEnvironment, redactions: ["secret"] })
  })

  it("does not execute when the Core runtime credential is missing", async () => {
    const host = new WindowsLocalDevelopmentSeedHost({
      workspaceRoot: "C:/repo",
      resolveEnvironment: async () => ({ values: {}, redactions: [] }),
      infrastructureStatus: async () => ({ services: [] }),
      migrationStatus: async () => [],
      fileExists: async () => true,
      execute: async () => undefined,
    })
    await expect(host.execute()).rejects.toThrow(/CORE_RUNTIME_DATABASE_URL/)
  })
})
