import { invoke as tauriInvoke } from "@tauri-apps/api/core"

import type { DesktopGateway } from "../../application/desktop-gateway"
import type {
  DesktopAppId,
  DesktopSettings,
  DesktopSnapshot,
  GateId,
  QuickTargetId,
} from "../../domain/types"

export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

export function createTauriGateway(invoke: Invoke = tauriInvoke): DesktopGateway {
  return {
    snapshot: () => invoke<DesktopSnapshot>("get_snapshot"),
    kill: (request) => invoke<DesktopSnapshot>("terminate_process", { request }),
    killMany: (request) => invoke<DesktopSnapshot>("terminate_processes", { request }),
    startApp: (appId: DesktopAppId) => invoke<void>("start_app", { appId }),
    stopApp: (appId: DesktopAppId) => invoke<void>("stop_app", { appId }),
    runGate: (gateId: GateId) => invoke<void>("run_gate", { gateId }),
    openTarget: (targetId: QuickTargetId) => invoke<void>("open_target", { targetId }),
    readSettings: () => invoke<DesktopSettings>("read_settings"),
    writeSettings: (settings) => invoke<DesktopSettings>("write_settings", { settings }),
  }
}
