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
  QuickTargetId,
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
}
