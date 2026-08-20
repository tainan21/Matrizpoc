import { Channel, invoke as tauriInvoke } from "@tauri-apps/api/core"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type {
  AppRuntime,
  DesktopAppId,
  DesktopSettings,
  DesktopSnapshot,
  DoctorCheck,
  GateId,
  GateResult,
  TerminalEvent,
  QuickTargetId,
  WorkspacePulse,
} from "../../domain/types"
import { TAURI_COMMAND_CONTRACT as commands } from "./command-contract"

export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>
export type ChannelFactory = (listener: (event: TerminalEvent) => void) => unknown

function createTauriChannel(listener: (event: TerminalEvent) => void): Channel<TerminalEvent> {
  const channel = new Channel<TerminalEvent>()
  channel.onmessage = listener
  return channel
}

export function createTauriGateway(
  invoke: Invoke = tauriInvoke,
  createChannel: ChannelFactory = createTauriChannel,
): DesktopGateway {
  return {
    snapshot: () => invoke<DesktopSnapshot>(commands.snapshot),
    kill: (request) => invoke<DesktopSnapshot>(commands.kill, { request }),
    killMany: (request) => invoke<DesktopSnapshot>(commands.killMany, { request }),
    startApp: (appId: DesktopAppId) => invoke<void>(commands.startApp, { appId }),
    stopApp: (appId: DesktopAppId) => invoke<void>(commands.stopApp, { appId }),
    appStatuses: () => invoke<readonly AppRuntime[]>(commands.appStatuses),
    runGate: (gateId: GateId) => invoke<GateResult>(commands.runGate, { gateId }),
    openTarget: (targetId: QuickTargetId) => invoke<void>(commands.openTarget, { targetId }),
    selectWorkspace: (path) => invoke<string>(commands.selectWorkspace, { path }),
    doctor: () => invoke<readonly DoctorCheck[]>(commands.doctor),
    workspacePulse: () => invoke<WorkspacePulse>(commands.workspacePulse),
    readSettings: () => invoke<DesktopSettings>(commands.readSettings),
    writeSettings: (settings) => invoke<DesktopSettings>(commands.writeSettings, { settings }),
    hide: () => invoke<void>(commands.hide),
    quit: () => invoke<void>(commands.quit),
    createTerminal: () => invoke(commands.createTerminal),
    writeTerminal: (sessionId, data) => invoke<void>(commands.writeTerminal, { sessionId, data }),
    resizeTerminal: (sessionId, columns, rows) =>
      invoke<void>(commands.resizeTerminal, { sessionId, columns, rows }),
    interruptTerminal: (sessionId) => invoke<void>(commands.interruptTerminal, { sessionId }),
    closeTerminal: (sessionId) => invoke<void>(commands.closeTerminal, { sessionId }),
    listTerminals: () => invoke(commands.listTerminals),
    subscribeTerminal: (listener) =>
      invoke<void>(commands.subscribeTerminal, { onEvent: createChannel(listener) }),
    startManagedOperation: (operationId) =>
      invoke(commands.startManagedOperation, { operationId }),
    getNativeAppRuntime: () => invoke(commands.getNativeAppRuntime),
    installNativeApp: () => invoke(commands.installNativeApp),
    startNativeApp: () => invoke(commands.startNativeApp),
    stopNativeApp: () => invoke(commands.stopNativeApp),
  }
}
