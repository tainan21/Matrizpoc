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
})
