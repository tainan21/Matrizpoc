import { describe, expect, it } from "vitest"
import { WindowsLocalEnvironmentResolver } from "./windows-local-environment-resolver"

const contract = JSON.stringify({
  schemaVersion: "v1",
  appId: "matriz-identity",
  classification: "platform",
  runtime: { kind: "service", port: 8080, healthPath: "/healthz" },
  database: { required: true, schema: "core", tenancy: "mixed", runtimeRole: "matriz_core_runtime", migrationRole: "matriz_core_migration", prismaSchema: "prisma/core/schema.prisma" },
  identity: { required: false },
  cache: { required: false, namespaces: [] },
  events: { transport: "nats-jetstream", outbox: true, inbox: true },
  environment: { keys: [
    { name: "IDENTITY_ISSUER", secret: false, required: true, source: "generated" },
    { name: "IDENTITY_CSRF_SECRET", secret: true, required: true, source: "control-vault" },
  ] },
  filesystem: { required: false },
})

describe("WindowsLocalEnvironmentResolver", () => {
  it("passes identifiers and paths only, then filters helper output through the contract", async () => {
    const calls: { file: string; args: readonly string[] }[] = []
    const resolver = new WindowsLocalEnvironmentResolver({
      helperPath: "C:/Program Files/Matriz/local-environment-helper.ps1",
      readFile: async () => contract,
      fileExists: async () => true,
      execute: async (file, args) => {
        calls.push({ file, args })
        return JSON.stringify({ IDENTITY_ISSUER: "http://127.0.0.1:8080", IDENTITY_CSRF_SECRET: "s".repeat(32), UNDECLARED: "leak" })
      },
    })

    await expect(resolver.resolve("C:/repo/apps/matriz-identity")).resolves.toEqual({
      values: { IDENTITY_ISSUER: "http://127.0.0.1:8080", IDENTITY_CSRF_SECRET: "s".repeat(32) },
      redactions: ["s".repeat(32)],
    })
    expect(calls).toEqual([{ file: "powershell.exe", args: ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", "C:/Program Files/Matriz/local-environment-helper.ps1", "-Action", "Resolve", "-AppId", "matriz-identity", "-ContractPath", "C:\\repo\\apps\\matriz-identity\\infrastructure.json"] }])
    expect(calls[0]?.args.join(" ")).not.toContain("s".repeat(32))
  })

  it("returns no environment when an app has no contract and rejects invalid helper JSON", async () => {
    const absent = new WindowsLocalEnvironmentResolver({ helperPath: "helper.ps1", readFile: async () => "", fileExists: async () => false, execute: async () => "" })
    await expect(absent.resolve("C:/repo/apps/tool")).resolves.toEqual({ values: {}, redactions: [] })
    const invalid = new WindowsLocalEnvironmentResolver({ helperPath: "helper.ps1", readFile: async () => contract, fileExists: async () => true, execute: async () => "not-json" })
    await expect(invalid.resolve("C:/repo/apps/matriz-identity")).rejects.toThrow(/invalid environment response/i)
  })

  it("merges environments for a workspace seed without allowing conflicting values", async () => {
    const contracts = new Map([
      ["C:\\repo\\apps\\matriz-identity\\infrastructure.json", contract],
      ["C:\\repo\\apps\\matriz-hub\\infrastructure.json", JSON.stringify({
        ...JSON.parse(contract),
        appId: "matriz-hub",
        environment: { keys: [
          { name: "MATRIZ_RUNTIME_PROFILE", secret: false, required: true, source: "generated" },
          { name: "HUB_DATABASE_URL", secret: true, required: true, source: "control-vault" },
        ] },
      })],
    ])
    const resolver = new WindowsLocalEnvironmentResolver({
      helperPath: "helper.ps1",
      fileExists: async (path) => contracts.has(path),
      readFile: async (path) => contracts.get(path) ?? "",
      execute: async (_file, args) => args.includes("matriz-identity")
        ? JSON.stringify({ IDENTITY_ISSUER: "http://127.0.0.1:8080", IDENTITY_CSRF_SECRET: "i".repeat(32) })
        : JSON.stringify({ MATRIZ_RUNTIME_PROFILE: "local", HUB_DATABASE_URL: "postgresql://hub:secret@127.0.0.1:55432/matriz?schema=hub" }),
    })

    await expect(resolver.resolveMany(["C:/repo/apps/matriz-identity", "C:/repo/apps/matriz-hub"])).resolves.toEqual({
      values: {
        IDENTITY_ISSUER: "http://127.0.0.1:8080",
        IDENTITY_CSRF_SECRET: "i".repeat(32),
        MATRIZ_RUNTIME_PROFILE: "local",
        HUB_DATABASE_URL: "postgresql://hub:secret@127.0.0.1:55432/matriz?schema=hub",
      },
      redactions: ["i".repeat(32), "postgresql://hub:secret@127.0.0.1:55432/matriz?schema=hub"],
    })

    const conflict = new WindowsLocalEnvironmentResolver({
      helperPath: "helper.ps1",
      fileExists: async () => true,
      readFile: async () => contract,
      execute: async (_file, args) => JSON.stringify({
        IDENTITY_ISSUER: args.some((value) => value.includes("first")) ? "http://127.0.0.1:8080" : "http://127.0.0.1:9999",
        IDENTITY_CSRF_SECRET: "s".repeat(32),
      }),
    })
    await expect(conflict.resolveMany(["C:/first", "C:/second"])).rejects.toThrow(/conflicting local environment value/i)
  })
})
