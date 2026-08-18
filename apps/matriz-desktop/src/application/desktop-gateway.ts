import type {
  DesktopAppId,
  DesktopSettings,
  DesktopSnapshot,
  GateId,
  KillManyRequest,
  KillRequest,
  QuickTargetId,
} from "../domain/types"

export interface DesktopGateway {
  snapshot(): Promise<DesktopSnapshot>
  kill(request: KillRequest): Promise<DesktopSnapshot>
  killMany(request: KillManyRequest): Promise<DesktopSnapshot>
  startApp(appId: DesktopAppId): Promise<void>
  stopApp(appId: DesktopAppId): Promise<void>
  runGate(gateId: GateId): Promise<void>
  openTarget(targetId: QuickTargetId): Promise<void>
  readSettings(): Promise<DesktopSettings>
  writeSettings(settings: DesktopSettings): Promise<DesktopSettings>
}
