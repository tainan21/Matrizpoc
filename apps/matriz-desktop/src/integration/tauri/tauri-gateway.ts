import { Channel, invoke as tauriInvoke } from "@tauri-apps/api/core"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type {
  AppRuntime,
  ActivityEnvelope,
  DesktopAppId,
  DesktopSettings,
  DesktopSnapshot,
  DoctorCheck,
  GateId,
  GateResult,
  TerminalEvent,
  QuickTargetId,
  RuntimeInstance,
  WorkspacePulse,
} from "../../domain/types"
import { TAURI_COMMAND_CONTRACT as commands } from "./command-contract"

export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>
export type ChannelFactory = (listener: (event: TerminalEvent) => void) => unknown
export type ActivityChannelFactory = (listener: (event: ActivityEnvelope) => void) => unknown

function createTauriChannel(listener: (event: TerminalEvent) => void): Channel<TerminalEvent> {
  const channel = new Channel<TerminalEvent>()
  channel.onmessage = listener
  return channel
}

function createActivityChannel(listener: (event: ActivityEnvelope) => void): Channel<ActivityEnvelope> {
  const channel = new Channel<ActivityEnvelope>()
  channel.onmessage = listener
  return channel
}

export function createTauriGateway(
  invoke: Invoke = tauriInvoke,
  createChannel: ChannelFactory = createTauriChannel,
  createActivity: ActivityChannelFactory = createActivityChannel,
): DesktopGateway {
  return {
    snapshot: () => invoke<DesktopSnapshot>(commands.snapshot),
    runtimeSnapshot: () => invoke<readonly RuntimeInstance[]>(commands.runtimeSnapshot),
    openRuntimeTarget: ({ appId, routePath }) =>
      invoke<void>(commands.openRuntimeTarget, { appId, routePath }),
    restartRuntime: (appId) => invoke(commands.restartRuntime, { appId }),
    stopRuntime: (appId) => invoke<void>(commands.stopRuntime, { appId }),
    openPreview: ({ appId, routePath }, bounds) =>
      invoke(commands.openPreview, { appId, routePath, bounds }),
    setPreviewBounds: (bounds) => invoke<void>(commands.setPreviewBounds, { bounds }),
    navigatePreview: ({ appId, routePath }) =>
      invoke(commands.navigatePreview, { appId, routePath }),
    previewBack: () => invoke<void>(commands.previewBack),
    previewForward: () => invoke<void>(commands.previewForward),
    reloadPreview: () => invoke<void>(commands.reloadPreview),
    closePreview: () => invoke<void>(commands.closePreview),
    activityHistory: () => invoke(commands.activityHistory),
    subscribeActivity: (listener) =>
      invoke<void>(commands.subscribeActivity, { onEvent: createActivity(listener) }),
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
    listEnvironments: (appId) => invoke(commands.listEnvironments, { appId }),
    readEnvironment: (appId, fileName) => invoke(commands.readEnvironment, { appId, fileName }),
    revealEnvironmentValue: (appId, fileName, key) => invoke(commands.revealEnvironmentValue, { appId, fileName, key }),
    saveEnvironment: (request) => invoke(commands.saveEnvironment, { request }),
    listDirectory: (appId, relativePath) => invoke(commands.listDirectory, { appId, relativePath }),
    previewFile: (appId, relativePath) => invoke(commands.previewFile, { appId, relativePath }),
    openResource: (appId, relativePath) => invoke(commands.openResource, { appId, relativePath }),
    revealResource: (appId, relativePath) => invoke(commands.revealResource, { appId, relativePath }),
    openResourceInEditor: (appId, relativePath) => invoke(commands.openResourceInEditor, { appId, relativePath }),
    renameResource: (appId, relativePath, newName) => invoke(commands.renameResource, { appId, relativePath, newName }),
    duplicateResource: (appId, relativePath, newName) => invoke(commands.duplicateResource, { appId, relativePath, newName }),
    recycleResource: (appId, relativePath) => invoke(commands.recycleResource, { appId, relativePath }),
    commerceSnapshot: () => invoke(commands.commerceSnapshot),
    acquirePackage: (packageId) => invoke(commands.acquirePackage, { packageId }),
    installPackage: (packageId) => invoke(commands.installPackage, { packageId }),
    uninstallPackage: (packageId) => invoke(commands.uninstallPackage, { packageId }),
  }
}
