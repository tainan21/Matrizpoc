import { describe, expect, it, vi } from "vitest"
import { localAppCatalog } from "../catalog"
import { buildNextDevInvocation, resolveExecutableInvocation, runLocalApp } from "./dev"

describe("app dev invocation", () => {
  it("targets only the selected app directory", () => {
    expect(buildNextDevInvocation(localAppCatalog[1]!, "C:/repo")).toEqual({
      command: "pnpm",
      args: ["exec", "next", "dev", "-H", "127.0.0.1", "-p", "3001"],
      cwd: "C:\\repo\\apps\\spot",
    })
  })

  it("runs pnpm through Node on Windows without a command shell", () => {
    expect(resolveExecutableInvocation(
      { command: "pnpm", args: ["exec", "next"] , cwd: "C:\\repo" },
      "win32",
      "C:\\pnpm\\pnpm.cjs",
      "C:\\node\\node.exe",
    )).toEqual({
      command: "C:\\node\\node.exe",
      args: ["C:\\pnpm\\pnpm.cjs", "exec", "next"],
      cwd: "C:\\repo",
    })
  })

  it("runs the native pnpm executable directly on Windows", () => {
    expect(resolveExecutableInvocation(
      { command: "pnpm", args: ["exec", "next"], cwd: "C:\\repo" },
      "win32",
      "C:\\pnpm\\pnpm.exe",
      "C:\\node\\node.exe",
    )).toEqual({
      command: "C:\\pnpm\\pnpm.exe",
      args: ["exec", "next"],
      cwd: "C:\\repo",
    })
  })

  it("fails before spawning when the preferred port is occupied", async () => {
    const spawn = vi.fn()

    await expect(runLocalApp(localAppCatalog[1]!, "C:/repo", {
      isPortAvailable: async () => false,
      spawn,
      waitForHealth: vi.fn(),
      write: vi.fn(),
    })).rejects.toThrow("port 3001 is already in use")

    expect(spawn).not.toHaveBeenCalled()
  })

  it("waits for health after starting exactly one process", async () => {
    const child = { pid: 8123, once: vi.fn(), kill: vi.fn() }
    const spawn = vi.fn(() => child)
    const waitForHealth = vi.fn(async () => ({ status: "ok" as const, appId: "spot", contractVersion: "v1" as const }))

    const running = await runLocalApp(localAppCatalog[1]!, "C:/repo", {
      isPortAvailable: async () => true,
      spawn,
      waitForHealth,
      write: vi.fn(),
    })

    expect(spawn).toHaveBeenCalledTimes(1)
    expect(waitForHealth).toHaveBeenCalledWith(expect.objectContaining({
      url: "http://127.0.0.1:3001/api/health",
      expectedAppId: "spot",
    }))
    expect(running.pid).toBe(8123)
  })
})
