import { EventEmitter } from "node:events"
import { describe, expect, it, vi } from "vitest"
import { resolveSpawnSpec, terminalEnvironment, TerminalSupervisor, type ProcessHandle, type ProcessRuntime } from "./terminal-supervisor"

class FakeRuntime implements ProcessRuntime {
  inputs: string[] = []
  handle = Object.assign(new EventEmitter(), { pid: 42, write: (input: string) => { this.inputs.push(input) }, stop: async () => {} }) as ProcessHandle
  action: Parameters<ProcessRuntime["start"]>[0] | undefined
  start(action: Parameters<ProcessRuntime["start"]>[0]): ProcessHandle { this.action = action; return this.handle }
}

describe("TerminalSupervisor", () => {
  it("resolves a controlled Windows shim without joining arguments into a shell string", () => {
    const action = { projectId: "demo", projectName: "Demo", actionId: "dev" as const, label: "Run", command: "corepack", args: ["pnpm", "run", "dev"], cwd: "C:/repo/apps/demo" }
    expect(resolveSpawnSpec(action, "win32", "C:/Windows/System32/cmd.exe")).toEqual({ command: "corepack.cmd", args: ["pnpm", "run", "dev"] })
    expect(resolveSpawnSpec(action, "linux", "")).toEqual({ command: "corepack", args: ["pnpm", "run", "dev"] })
  })

  it("supports approved external action ids without widening the caller payload", async () => {
    const runtime = new FakeRuntime()
    const supervisor = new TerminalSupervisor({ rootDir: "C:/repo", runtime, resolveAction: async () => ({ projectId: "external", projectName: "External", actionId: "run.dev", label: "Run", command: "npm", args: ["run", "dev"], cwd: "C:/Projects/external", route: "project/external", port: 4100 }) })
    const session = await supervisor.start("external", "run.dev")
    expect(session).toMatchObject({ actionId: "run.dev", route: "project/external", port: 4100 })
  })
  it("does not pass Control credentials to child projects", () => {
    expect(terminalEnvironment({ NODE_ENV: "test", PATH: "bin", MATRIZ_CONTROL_LOCAL_TOKEN: "secret", MATRIZ_CONTROL_COOKIE_SECURE: "true" })).toEqual({ NODE_ENV: "test", PATH: "bin" })
  })
  it("injects only the resolved app environment and redacts secret values from output", async () => {
    const runtime = new FakeRuntime()
    const secret = "identity-secret-value-0123456789"
    const supervisor = new TerminalSupervisor({ rootDir: "C:/repo", runtime, resolveAction: async () => ({ projectId: "identity", projectName: "Identity", actionId: "dev", label: "Run", command: "pnpm", args: ["dev"], cwd: "C:/repo/apps/matriz-identity", environment: { PORT: "8080", IDENTITY_CSRF_SECRET: secret }, redactions: [secret] }) })
    const session = await supervisor.start("identity", "dev")
    runtime.handle.emit("output", `started with ${secret}\n`)
    expect(runtime.action?.environment).toEqual({ PORT: "8080", IDENTITY_CSRF_SECRET: secret })
    expect(supervisor.get(session.id)?.lines).toEqual(["started with [redacted]"])
    expect(supervisor.get(session.id)).not.toHaveProperty("environment")
  })
  it("reuses an active project action and captures bounded output", async () => {
    const runtime = new FakeRuntime()
    const supervisor = new TerminalSupervisor({ rootDir: "C:/repo", runtime, maxLines: 3, resolveAction: async () => ({ projectId: "demo", projectName: "Demo", actionId: "dev", label: "Run", command: "pnpm", args: ["dev"], cwd: "C:/repo/apps/demo" }) })
    const first = await supervisor.start("demo", "dev")
    const second = await supervisor.start("demo", "dev")
    runtime.handle.emit("output", "one\ntwo\nthree\nfour\n")
    expect(second.id).toBe(first.id)
    expect(supervisor.get(first.id)?.lines).toEqual(["two", "three", "four"])
  })

  it("records process exit", async () => {
    const runtime = new FakeRuntime()
    const supervisor = new TerminalSupervisor({ rootDir: "C:/repo", runtime, resolveAction: async () => ({ projectId: "demo", projectName: "Demo", actionId: "dev", label: "Run", command: "pnpm", args: ["dev"], cwd: "C:/repo/apps/demo" }) })
    const session = await supervisor.start("demo", "dev")
    runtime.handle.emit("exit", 7)
    expect(supervisor.get(session.id)).toMatchObject({ status: "exited", exitCode: 7 })
  })

  it("allows the repair loop to await the exact declared action result", async () => {
    const runtime = new FakeRuntime()
    const supervisor = new TerminalSupervisor({ rootDir: "C:/repo", runtime, resolveAction: async () => ({ projectId: "demo", projectName: "Demo", actionId: "test", label: "Test", command: "pnpm", args: ["test"], cwd: "C:/repo/apps/demo" }) })
    const session = await supervisor.start("demo", "test")
    const completed = supervisor.waitForExit(session.id)
    runtime.handle.emit("output", "PASS\n")
    runtime.handle.emit("exit", 0)

    await expect(completed).resolves.toMatchObject({ status: "exited", exitCode: 0, lines: ["PASS"] })
  })

  it("delivers one eligible failure without blocking terminal state", async () => {
    const runtime = new FakeRuntime()
    const delivered: string[] = []
    const supervisor = new TerminalSupervisor({
      rootDir: "C:/repo",
      runtime,
      onEligibleFailure: async (diagnostic) => { delivered.push(diagnostic.fingerprint) },
      resolveAction: async () => ({ projectId: "demo", projectName: "Demo", actionId: "test", label: "Test", command: "pnpm", args: ["test"], cwd: "C:/repo/apps/demo" }),
    })
    const session = await supervisor.start("demo", "test")
    runtime.handle.emit("output", "FAIL expected true\n")
    runtime.handle.emit("exit", 1)

    expect(supervisor.get(session.id)).toMatchObject({ status: "exited", exitCode: 1 })
    await vi.waitFor(() => expect(delivered).toHaveLength(1))
  })

  it("keeps terminal state stable when diagnostic delivery fails", async () => {
    const runtime = new FakeRuntime()
    const supervisor = new TerminalSupervisor({
      rootDir: "C:/repo",
      runtime,
      onEligibleFailure: async () => { throw new Error("Workbench offline") },
      resolveAction: async () => ({ projectId: "demo", projectName: "Demo", actionId: "lint", label: "Lint", command: "pnpm", args: ["lint"], cwd: "C:/repo/apps/demo" }),
    })
    const session = await supervisor.start("demo", "lint")
    runtime.handle.emit("output", "lint failed\n")
    runtime.handle.emit("exit", 1)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(supervisor.get(session.id)).toMatchObject({ status: "exited", exitCode: 1, error: null })
  })

  it("removes terminal control sequences from browser output", async () => {
    const runtime = new FakeRuntime()
    const supervisor = new TerminalSupervisor({ rootDir: "C:/repo", runtime, resolveAction: async () => ({ projectId: "demo", projectName: "Demo", actionId: "dev", label: "Run", command: "pnpm", args: ["dev"], cwd: "C:/repo/apps/demo" }) })
    const session = await supervisor.start("demo", "dev")
    runtime.handle.emit("output", "\u001b[31merror\u001b[0m\n")
    expect(supervisor.get(session.id)?.lines).toEqual(["error"])
  })

  it("shows a lowercase mih route and resolves only cd mih to the workspace root", async () => {
    const runtime = new FakeRuntime()
    const supervisor = new TerminalSupervisor({ rootDir: "C:/Apps/Matriz-Infra-Hub", runtime, resolveAction: async () => ({ projectId: "Demo", projectName: "Demo", actionId: "dev", label: "Run", command: "pnpm", args: ["dev"], cwd: "C:/Apps/Matriz-Infra-Hub/apps/Demo" }) })
    const session = await supervisor.start("demo", "dev")

    expect(supervisor.get(session.id)?.route).toBe("mih/apps/demo")

    supervisor.write(session.id, "cd mih\n")

    expect(supervisor.get(session.id)?.route).toBe("mih")
    expect(runtime.inputs).toEqual([])
  })

  it("does not treat arbitrary cd input as a terminal route", async () => {
    const runtime = new FakeRuntime()
    const supervisor = new TerminalSupervisor({ rootDir: "C:/Apps/matriz-infra-hub", runtime, resolveAction: async () => ({ projectId: "demo", projectName: "Demo", actionId: "dev", label: "Run", command: "pnpm", args: ["dev"], cwd: "C:/Apps/matriz-infra-hub/apps/demo" }) })
    const session = await supervisor.start("demo", "dev")

    supervisor.write(session.id, "cd ..\n")

    expect(supervisor.get(session.id)?.route).toBe("mih/apps/demo")
    expect(runtime.inputs).toEqual(["cd ..\n"])
  })
})
