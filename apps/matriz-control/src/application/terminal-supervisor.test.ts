import { EventEmitter } from "node:events"
import { describe, expect, it } from "vitest"
import { resolveSpawnSpec, terminalEnvironment, TerminalSupervisor, type ProcessHandle, type ProcessRuntime } from "./terminal-supervisor"

class FakeRuntime implements ProcessRuntime {
  inputs: string[] = []
  handle = Object.assign(new EventEmitter(), { pid: 42, write: (input: string) => { this.inputs.push(input) }, stop: async () => {} }) as ProcessHandle
  start(): ProcessHandle { return this.handle }
}

describe("TerminalSupervisor", () => {
  it("uses the explicit Windows command processor for a controlled shim", () => {
    const action = { projectId: "demo", projectName: "Demo", actionId: "dev" as const, label: "Run", command: "corepack", args: ["pnpm", "run", "dev"], cwd: "C:/repo/apps/demo" }
    expect(resolveSpawnSpec(action, "win32", "C:/Windows/System32/cmd.exe")).toEqual({ command: "C:/Windows/System32/cmd.exe", args: ["/d", "/s", "/c", "corepack pnpm run dev"] })
    expect(resolveSpawnSpec(action, "linux", "")).toEqual({ command: "corepack", args: ["pnpm", "run", "dev"] })
  })
  it("does not pass Control credentials to child projects", () => {
    expect(terminalEnvironment({ NODE_ENV: "test", PATH: "bin", MATRIZ_CONTROL_LOCAL_TOKEN: "secret", MATRIZ_CONTROL_COOKIE_SECURE: "true" })).toEqual({ NODE_ENV: "test", PATH: "bin" })
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
