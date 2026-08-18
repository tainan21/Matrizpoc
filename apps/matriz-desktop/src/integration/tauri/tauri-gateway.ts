import { invoke as tauriInvoke } from "@tauri-apps/api/core"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type {
  AppRuntime,
  DesktopAppId,
  DesktopSettings,
  DesktopSnapshot,
  DoctorCheck,
  GateId,
  GateResult,
  QuickTargetId,
  WorkspacePulse,
} from "../../domain/types"

export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

export function createTauriGateway(invoke: Invoke = tauriInvoke): DesktopGateway {
  return {
    snapshot: () => invoke<DesktopSnapshot>("get_snapshot"),
    kill: (request) => invoke<DesktopSnapshot>("terminate_process", { request }),
    killMany: (request) => invoke<DesktopSnapshot>("terminate_processes", { request }),
    startApp: (appId: DesktopAppId) => invoke<void>("start_app", { appId }),
    stopApp: (appId: DesktopAppId) => invoke<void>("stop_app", { appId }),
    appStatuses: () => invoke<readonly AppRuntime[]>("get_app_statuses"),
    runGate: (gateId: GateId) => invoke<GateResult>("run_gate", { gateId }),
    openTarget: (targetId: QuickTargetId) => invoke<void>("open_target", { targetId }),
    selectWorkspace: (path) => invoke<string>("select_workspace", { path }),
    doctor: () => invoke<readonly DoctorCheck[]>("run_doctor"),
    workspacePulse: () => invoke<WorkspacePulse>("get_workspace_pulse"),
    readSettings: () => invoke<DesktopSettings>("read_settings"),
    writeSettings: (settings) => invoke<DesktopSettings>("write_settings", { settings }),
    hide: () => invoke<void>("hide_window"),
    quit: () => invoke<void>("quit_app"),
  }
}
