import { describe, expect, it, vi } from "vitest"

import { TAURI_COMMAND_CONTRACT } from "./command-contract"
import { createTauriGateway, type Invoke } from "./tauri-gateway"

describe("Tauri command contract", () => {
  it("defines exactly one native command for every DesktopGateway method", () => {
    expect(TAURI_COMMAND_CONTRACT).toEqual({
      snapshot: "get_snapshot",
      runtimeSnapshot: "get_runtime_snapshot",
      openRuntimeTarget: "open_runtime_target",
      restartRuntime: "restart_runtime",
      stopRuntime: "stop_runtime",
      openPreview: "open_preview",
      setPreviewBounds: "set_preview_bounds",
      navigatePreview: "navigate_preview",
      previewBack: "preview_back",
      previewForward: "preview_forward",
      reloadPreview: "reload_preview",
      closePreview: "close_preview",
      activityHistory: "get_activity_history",
      subscribeActivity: "subscribe_activity",
      kill: "terminate_process",
      killMany: "terminate_processes",
      startApp: "start_app",
      stopApp: "stop_app",
      appStatuses: "get_app_statuses",
      runGate: "run_gate",
      openTarget: "open_target",
      selectWorkspace: "select_workspace",
      doctor: "run_doctor",
      workspacePulse: "get_workspace_pulse",
      readSettings: "read_settings",
      writeSettings: "write_settings",
      hide: "hide_window",
      quit: "quit_app",
      createTerminal: "create_terminal",
      writeTerminal: "write_terminal",
      resizeTerminal: "resize_terminal",
      interruptTerminal: "interrupt_terminal",
      closeTerminal: "close_terminal",
      listTerminals: "list_terminals",
      subscribeTerminal: "subscribe_terminal",
      startManagedOperation: "start_managed_operation",
      getNativeAppRuntime: "get_native_app_runtime",
      installNativeApp: "install_native_app",
      startNativeApp: "start_native_app",
      stopNativeApp: "stop_native_app",
      listEnvironments: "list_environments",
      readEnvironment: "read_environment",
      revealEnvironmentValue: "reveal_environment_value",
      saveEnvironment: "save_environment",
      listDirectory: "list_directory",
      previewFile: "preview_file",
      openResource: "open_resource",
      revealResource: "reveal_resource",
      openResourceInEditor: "open_resource_in_editor",
      renameResource: "rename_resource",
      duplicateResource: "duplicate_resource",
      recycleResource: "recycle_resource",
    })
    expect(Object.isFrozen(TAURI_COMMAND_CONTRACT)).toBe(true)
  })

  it("serializes every gateway method with exact camelCase argument keys", async () => {
    const calls: { command: string; args: Record<string, unknown> | undefined }[] = []
    const invoke: Invoke = vi.fn(async (command, args) => {
      calls.push({ command, args })
      return undefined as never
    })
    const gateway = createTauriGateway(invoke, () => "acceptance-channel", () => "activity-channel")
    const settings = {
      closeToTray: true,
      soundsEnabled: false,
      volume: 0.25,
      startWithWindows: false,
    }

    await gateway.snapshot()
    await gateway.runtimeSnapshot()
    await gateway.openRuntimeTarget({ appId: "matriz-admin", routePath: "/settings" })
    await gateway.restartRuntime("matriz-admin")
    await gateway.stopRuntime("matriz-admin")
    const bounds = { x: 10, y: 20, width: 800, height: 500 }
    await gateway.openPreview({ appId: "matriz-admin", routePath: "/" }, bounds)
    await gateway.setPreviewBounds(bounds)
    await gateway.navigatePreview({ appId: "matriz-admin", routePath: "/settings" })
    await gateway.previewBack()
    await gateway.previewForward()
    await gateway.reloadPreview()
    await gateway.closePreview()
    await gateway.activityHistory()
    await gateway.subscribeActivity(() => undefined)
    await gateway.kill({ pid: 321, snapshotId: "snapshot-1" })
    await gateway.killMany({ pids: [321, 654], snapshotId: "snapshot-1" })
    await gateway.startApp("matriz-hub")
    await gateway.stopApp("matriz-hub")
    await gateway.appStatuses()
    await gateway.runGate("lint")
    await gateway.openTarget("workspace")
    await gateway.selectWorkspace("C:\\Apps\\matriz-infra-hub")
    await gateway.doctor()
    await gateway.workspacePulse()
    await gateway.readSettings()
    await gateway.writeSettings(settings)
    await gateway.hide()
    await gateway.quit()
    await gateway.createTerminal()
    await gateway.writeTerminal("term-1", "echo ok\r")
    await gateway.resizeTerminal("term-1", 120, 40)
    await gateway.interruptTerminal("term-1")
    await gateway.closeTerminal("term-1")
    await gateway.listTerminals()
    await gateway.subscribeTerminal(() => undefined)
    await gateway.startManagedOperation("gate.lint")
    await gateway.getNativeAppRuntime()
    await gateway.installNativeApp()
    await gateway.startNativeApp()
    await gateway.stopNativeApp()
    await gateway.listEnvironments("matriz-admin")
    await gateway.readEnvironment("matriz-admin", ".env.local")
    await gateway.revealEnvironmentValue("matriz-admin", ".env.local", "JWT_SECRET")
    const environmentRequest = { appId: "matriz-admin" as const, fileName: ".env.local", revision: "rev-1", variables: [{ key: "PORT", value: "3002" }] }
    await gateway.saveEnvironment(environmentRequest)
    await gateway.listDirectory("matriz-admin", "src")
    await gateway.previewFile("matriz-admin", "src/index.ts")
    await gateway.openResource("matriz-admin", "src/index.ts")
    await gateway.revealResource("matriz-admin", "src/index.ts")
    await gateway.openResourceInEditor("matriz-admin", "src/index.ts")
    await gateway.renameResource("matriz-admin", "src/index.ts", "main.ts")
    await gateway.duplicateResource("matriz-admin", "src/main.ts", "main.copy.ts")
    await gateway.recycleResource("matriz-admin", "src/main.copy.ts")

    expect(calls).toEqual([
      { command: "get_snapshot", args: undefined },
      { command: "get_runtime_snapshot", args: undefined },
      { command: "open_runtime_target", args: { appId: "matriz-admin", routePath: "/settings" } },
      { command: "restart_runtime", args: { appId: "matriz-admin" } },
      { command: "stop_runtime", args: { appId: "matriz-admin" } },
      { command: "open_preview", args: { appId: "matriz-admin", routePath: "/", bounds } },
      { command: "set_preview_bounds", args: { bounds } },
      { command: "navigate_preview", args: { appId: "matriz-admin", routePath: "/settings" } },
      { command: "preview_back", args: undefined },
      { command: "preview_forward", args: undefined },
      { command: "reload_preview", args: undefined },
      { command: "close_preview", args: undefined },
      { command: "get_activity_history", args: undefined },
      { command: "subscribe_activity", args: { onEvent: "activity-channel" } },
      { command: "terminate_process", args: { request: { pid: 321, snapshotId: "snapshot-1" } } },
      {
        command: "terminate_processes",
        args: { request: { pids: [321, 654], snapshotId: "snapshot-1" } },
      },
      { command: "start_app", args: { appId: "matriz-hub" } },
      { command: "stop_app", args: { appId: "matriz-hub" } },
      { command: "get_app_statuses", args: undefined },
      { command: "run_gate", args: { gateId: "lint" } },
      { command: "open_target", args: { targetId: "workspace" } },
      { command: "select_workspace", args: { path: "C:\\Apps\\matriz-infra-hub" } },
      { command: "run_doctor", args: undefined },
      { command: "get_workspace_pulse", args: undefined },
      { command: "read_settings", args: undefined },
      { command: "write_settings", args: { settings } },
      { command: "hide_window", args: undefined },
      { command: "quit_app", args: undefined },
      { command: "create_terminal", args: undefined },
      { command: "write_terminal", args: { sessionId: "term-1", data: "echo ok\r" } },
      {
        command: "resize_terminal",
        args: { sessionId: "term-1", columns: 120, rows: 40 },
      },
      { command: "interrupt_terminal", args: { sessionId: "term-1" } },
      { command: "close_terminal", args: { sessionId: "term-1" } },
      { command: "list_terminals", args: undefined },
      { command: "subscribe_terminal", args: { onEvent: "acceptance-channel" } },
      { command: "start_managed_operation", args: { operationId: "gate.lint" } },
      { command: "get_native_app_runtime", args: undefined },
      { command: "install_native_app", args: undefined },
      { command: "start_native_app", args: undefined },
      { command: "stop_native_app", args: undefined },
      { command: "list_environments", args: { appId: "matriz-admin" } },
      { command: "read_environment", args: { appId: "matriz-admin", fileName: ".env.local" } },
      { command: "reveal_environment_value", args: { appId: "matriz-admin", fileName: ".env.local", key: "JWT_SECRET" } },
      { command: "save_environment", args: { request: environmentRequest } },
      { command: "list_directory", args: { appId: "matriz-admin", relativePath: "src" } },
      { command: "preview_file", args: { appId: "matriz-admin", relativePath: "src/index.ts" } },
      { command: "open_resource", args: { appId: "matriz-admin", relativePath: "src/index.ts" } },
      { command: "reveal_resource", args: { appId: "matriz-admin", relativePath: "src/index.ts" } },
      { command: "open_resource_in_editor", args: { appId: "matriz-admin", relativePath: "src/index.ts" } },
      { command: "rename_resource", args: { appId: "matriz-admin", relativePath: "src/index.ts", newName: "main.ts" } },
      { command: "duplicate_resource", args: { appId: "matriz-admin", relativePath: "src/main.ts", newName: "main.copy.ts" } },
      { command: "recycle_resource", args: { appId: "matriz-admin", relativePath: "src/main.copy.ts" } },
    ])
  })
})
