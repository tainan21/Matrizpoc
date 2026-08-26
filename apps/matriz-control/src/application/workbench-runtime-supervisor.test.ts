import { EventEmitter } from "node:events"
import { describe, expect, it } from "vitest"
import { WorkbenchRuntimeSupervisor, workbenchEnvironment, type WorkbenchProcessHandle, type WorkbenchProcessRuntime } from "./workbench-runtime-supervisor"

class FakeRuntime implements WorkbenchProcessRuntime {
  starts = 0
  handle = Object.assign(new EventEmitter(), { pid: 77, stop: async () => undefined }) as WorkbenchProcessHandle
  start() { this.starts += 1; return this.handle }
}

describe("Workbench runtime supervisor", () => {
  it("builds a minimal environment with distinct session and capability secrets", () => {
    const environment = workbenchEnvironment({ PATH: "bin", OPENAI_API_KEY: "provider", MATRIZ_CONTROL_LOCAL_TOKEN: "control" }, "session-secret", "capability-secret", "C:/repo")
    expect(environment).toEqual({
      PATH: "bin",
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: "127.0.0.1",
      PORT: "3005",
      WORKBENCH_RUNTIME_MODE: "control-desktop",
      WORKBENCH_LOCAL_TOKEN: "session-secret",
      WORKBENCH_CONTROL_CAPABILITY: "capability-secret",
      MATRIZ_WORKSPACE_ROOT: "C:/repo",
    })
  })

  it("starts one process and becomes ready only after compatible health", async () => {
    const runtime = new FakeRuntime()
    let healthChecks = 0
    const supervisor = new WorkbenchRuntimeSupervisor({
      rootDir: "C:/repo",
      serverPath: "C:/resources/workbench/server.js",
      runtime,
      health: async () => {
        healthChecks += 1
        if (healthChecks === 1) throw new Error("starting")
        return { contractVersion: "workbench-control-v1" }
      },
      wait: async () => undefined,
      randomSecret: () => "s".repeat(64),
    })

    const first = await supervisor.start()
    const second = await supervisor.start()

    expect(first).toMatchObject({ status: "ready", pid: 77 })
    expect(second).toEqual(first)
    expect(runtime.starts).toBe(1)
  })

  it("classifies incompatible health without stopping an unknown process", async () => {
    const runtime = new FakeRuntime()
    const supervisor = new WorkbenchRuntimeSupervisor({
      rootDir: "C:/repo",
      serverPath: "C:/resources/workbench/server.js",
      runtime,
      health: async () => ({ contractVersion: "other" }),
      wait: async () => undefined,
      randomSecret: () => "s".repeat(64),
    })

    await expect(supervisor.start()).resolves.toMatchObject({ status: "incompatible", pid: 77 })
  })

  it("keeps the raw desktop connection secrets outside the public snapshot", async () => {
    const secrets = ["session".padEnd(64, "s"), "capability".padEnd(64, "c")]
    const supervisor = new WorkbenchRuntimeSupervisor({
      rootDir: "C:/repo",
      serverPath: "C:/resources/workbench/server.js",
      runtime: new FakeRuntime(),
      health: async () => ({ contractVersion: "workbench-control-v1" }),
      randomSecret: () => secrets.shift()!,
    })
    const snapshot = await supervisor.start()

    expect(snapshot).not.toHaveProperty("sessionSecret")
    expect(supervisor.connection()).toEqual({
      url: "http://127.0.0.1:3005",
      sessionSecret: "session".padEnd(64, "s"),
      capability: "capability".padEnd(64, "c"),
    })
  })
})
