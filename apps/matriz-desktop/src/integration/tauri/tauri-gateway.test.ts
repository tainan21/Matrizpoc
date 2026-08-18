import { describe, expect, it, vi } from "vitest"

import { createTauriGateway } from "./tauri-gateway"

describe("Tauri desktop gateway", () => {
  it("serializes destructive actions with snapshot authorization", async () => {
    const invoke = vi.fn().mockResolvedValue({ snapshotId: "next", ports: [] })
    const gateway = createTauriGateway(invoke)

    await gateway.kill({ pid: 3210, snapshotId: "observed" })
    await gateway.killMany({ pids: [3210, 6543], snapshotId: "observed" })

    expect(invoke.mock.calls).toEqual([
      ["terminate_process", { request: { pid: 3210, snapshotId: "observed" } }],
      ["terminate_processes", { request: { pids: [3210, 6543], snapshotId: "observed" } }],
    ])
  })

  it("passes only catalog identifiers to execution commands", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined)
    const gateway = createTauriGateway(invoke)

    await gateway.startApp("matrizlib")
    await gateway.runGate("test:smoke")
    await gateway.openTarget("workspace")

    expect(invoke.mock.calls).toEqual([
      ["start_app", { appId: "matrizlib" }],
      ["run_gate", { gateId: "test:smoke" }],
      ["open_target", { targetId: "workspace" }],
    ])
  })

  it("maps terminal lifecycle to typed native commands", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined)
    const channel = { onmessage: undefined as unknown }
    const createChannel = vi.fn(() => channel)
    const gateway = createTauriGateway(invoke, createChannel)
    const listener = vi.fn()

    await gateway.createTerminal()
    await gateway.writeTerminal("session-1", "Get-Location\r")
    await gateway.resizeTerminal("session-1", 120, 40)
    await gateway.interruptTerminal("session-1")
    await gateway.closeTerminal("session-1")
    await gateway.listTerminals()
    await gateway.subscribeTerminal(listener)
    await gateway.startManagedOperation("app.seumei.native.build")
    await gateway.getNativeAppRuntime()

    expect(createChannel).toHaveBeenCalledWith(listener)
    expect(invoke.mock.calls).toEqual([
      ["create_terminal"],
      ["write_terminal", { sessionId: "session-1", data: "Get-Location\r" }],
      ["resize_terminal", { sessionId: "session-1", columns: 120, rows: 40 }],
      ["interrupt_terminal", { sessionId: "session-1" }],
      ["close_terminal", { sessionId: "session-1" }],
      ["list_terminals"],
      ["subscribe_terminal", { onEvent: channel }],
      ["start_managed_operation", { operationId: "app.seumei.native.build" }],
      ["get_native_app_runtime"],
    ])
  })
})
