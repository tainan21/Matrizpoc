import { describe, expect, it, vi } from "vitest"
import { WindowsLocalEnvironmentExportHost } from "./windows-local-environment-export-host"

describe("WindowsLocalEnvironmentExportHost", () => {
  it("discovers an app only through its contract and verifies git-ignore", async () => {
    const host = new WindowsLocalEnvironmentExportHost({
      workspaceRoot: "C:/repo",
      listDirectories: async () => ["folder-a", "folder-b"],
      readFile: async (path) => path.includes("folder-b") ? JSON.stringify({ schemaVersion: "v1", appId: "matriz-hub" }) : JSON.stringify({ schemaVersion: "v1", appId: "spot" }),
      fileExists: async (path) => path.endsWith(".env.development.local"),
      gitIgnored: async (path) => path.includes("folder-b"),
      resolveEnvironment: async () => ({ values: {}, redactions: [] }),
      writeAtomic: async () => undefined,
      restrictAcl: async () => undefined,
    })
    await expect(host.inspect("matriz-hub")).resolves.toEqual({ appId: "matriz-hub", targetExists: true, gitIgnored: true })
    await expect(host.inspect("unknown-app")).rejects.toThrow(/unknown infrastructure app/i)
  })

  it("writes a generated file atomically and applies the Windows ACL without returning secrets", async () => {
    const writeAtomic = vi.fn(async () => undefined)
    const restrictAcl = vi.fn(async () => undefined)
    const host = new WindowsLocalEnvironmentExportHost({
      workspaceRoot: "C:/repo",
      listDirectories: async () => ["matriz-hub"],
      readFile: async () => JSON.stringify({ schemaVersion: "v1", appId: "matriz-hub" }),
      fileExists: async () => false,
      gitIgnored: async () => true,
      resolveEnvironment: async () => ({ values: { HUB_SECRET: "top-secret", HUB_PORT: "3000" }, redactions: ["top-secret"] }),
      writeAtomic,
      restrictAcl,
    })
    await expect(host.write("matriz-hub")).resolves.toBeUndefined()
    expect(writeAtomic).toHaveBeenCalledWith("C:\\repo\\apps\\matriz-hub\\.env.development.local", "# Generated explicitly by Matriz Control. Do not commit.\nHUB_PORT=\"3000\"\nHUB_SECRET=\"top-secret\"\n")
    expect(restrictAcl).toHaveBeenCalledWith("C:\\repo\\apps\\matriz-hub\\.env.development.local")
  })
})
