import { describe, expect, it, vi } from "vitest"
import { WindowsNatsCredentialProvisioner } from "./nats-credential-provisioner"

describe("WindowsNatsCredentialProvisioner", () => {
  it("retrieves the DPAPI-protected password without putting it in arguments and returns only its bcrypt verifier", async () => {
    const execute = vi.fn(async () => JSON.stringify({ payPassword: "p".repeat(64), seumeiPassword: "s".repeat(64), hubPassword: "h".repeat(64), controlPassword: "c".repeat(64) }))
    const hash = vi.fn(async () => "$2b$12$" + "x".repeat(53))
    const provision = vi.fn(async () => undefined)
    const provisioner = new WindowsNatsCredentialProvisioner({ helperPath: "C:/Matriz/nats-credential-helper.ps1", execute, hash, provision })
    const prepared = await provisioner.prepare()
    expect(prepared).toMatchObject({ payPasswordHash: "$2b$12$" + "x".repeat(53), seumeiPasswordHash: "$2b$12$" + "x".repeat(53), hubPasswordHash: "$2b$12$" + "x".repeat(53), controlPasswordHash: "$2b$12$" + "x".repeat(53) })
    expect(execute).toHaveBeenCalledWith("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", "C:/Matriz/nats-credential-helper.ps1", "-Action", "ProvisionDomains"], expect.any(Object))
    const call = execute.mock.calls[0] as unknown as [string, readonly string[], NodeJS.ProcessEnv]
    expect(call[1].join(" ")).not.toContain("p".repeat(64))
    await prepared.provisionStreams()
    expect(provision).toHaveBeenCalledWith("c".repeat(64))
  })

  it("rejects malformed helper output", async () => {
    const provisioner = new WindowsNatsCredentialProvisioner({ helperPath: "helper.ps1", execute: async () => "short", hash: async () => "unused" })
    await expect(provisioner.prepare()).rejects.toThrow(/invalid/i)
  })

  it("does not pass PowerShell 7 module paths to the Windows PowerShell credential helper", async () => {
    const execute = vi.fn(async () => JSON.stringify({ payPassword: "p".repeat(64), seumeiPassword: "s".repeat(64), hubPassword: "h".repeat(64), controlPassword: "c".repeat(64) }))
    const provisioner = new WindowsNatsCredentialProvisioner({
      helperPath: "helper.ps1",
      execute,
      environment: {
        NODE_ENV: "test",
        PSModulePath: "C:\\Program Files\\PowerShell\\Modules;C:\\Program Files\\WindowsPowerShell\\Modules;C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules",
      },
      hash: async () => "$2b$12$" + "x".repeat(53),
    })

    await provisioner.prepare()

    expect(execute).toHaveBeenCalledWith(
      "powershell.exe",
      expect.any(Array),
      { NODE_ENV: "test", PSModulePath: "C:\\Program Files\\WindowsPowerShell\\Modules;C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules" },
    )
  })
})
