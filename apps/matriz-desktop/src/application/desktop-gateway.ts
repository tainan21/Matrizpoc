import type {
  AppRuntime,
  DesktopAppId,
  DesktopSettings,
  DesktopSnapshot,
  DoctorCheck,
  GateId,
  GateResult,
  KillManyRequest,
  KillRequest,
  ManagedOperationId,
  NativeAppRuntime,
  QuickTargetId,
  TerminalEvent,
  TerminalSession,
  WorkspacePulse,
} from "../domain/types"

export interface DesktopGateway {
  snapshot(): Promise<DesktopSnapshot>
  kill(request: KillRequest): Promise<DesktopSnapshot>
  killMany(request: KillManyRequest): Promise<DesktopSnapshot>
  startApp(appId: DesktopAppId): Promise<void>
  stopApp(appId: DesktopAppId): Promise<void>
  appStatuses(): Promise<readonly AppRuntime[]>
  runGate(gateId: GateId): Promise<GateResult>
  openTarget(targetId: QuickTargetId): Promise<void>
  selectWorkspace(path: string): Promise<string>
  doctor(): Promise<readonly DoctorCheck[]>
  workspacePulse(): Promise<WorkspacePulse>
  readSettings(): Promise<DesktopSettings>
  writeSettings(settings: DesktopSettings): Promise<DesktopSettings>
  hide(): Promise<void>
  quit(): Promise<void>
  createTerminal(): Promise<TerminalSession>
  writeTerminal(sessionId: string, data: string): Promise<void>
  resizeTerminal(sessionId: string, columns: number, rows: number): Promise<void>
  interruptTerminal(sessionId: string): Promise<void>
  closeTerminal(sessionId: string): Promise<void>
  listTerminals(): Promise<readonly TerminalSession[]>
  subscribeTerminal(listener: (event: TerminalEvent) => void): Promise<void>
  startManagedOperation(operationId: ManagedOperationId): Promise<TerminalSession>
  getNativeAppRuntime(): Promise<NativeAppRuntime>
  installNativeApp(): Promise<NativeAppRuntime>
  startNativeApp(): Promise<NativeAppRuntime>
}
