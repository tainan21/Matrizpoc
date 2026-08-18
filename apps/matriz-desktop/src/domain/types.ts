export type DesktopAppId =
  | "matriz-hub"
  | "spot"
  | "seumei"
  | "contracts"
  | "willdash"
  | "matriz-workbench"
  | "sites"
  | "matrizlib"

export type GateId = "typecheck" | "lint" | "test:smoke" | "prisma:validate"
export type QuickTargetId = "workspace" | "terminal" | "hub" | "matrizlib" | "workbench"
export type PortState = "external" | "starting" | "ready" | "degraded"

export interface PortProcess {
  readonly port: number
  readonly pid: number
  readonly processName: string
  readonly executablePath?: string
  readonly state: PortState
}

export interface DesktopSnapshot {
  readonly snapshotId: string
  readonly ports: readonly PortProcess[]
}

export interface KillRequest {
  readonly pid: number
  readonly snapshotId: string
}

export interface KillManyRequest {
  readonly pids: readonly number[]
  readonly snapshotId: string
}

export interface DesktopSettings {
  readonly closeToTray: boolean
  readonly soundsEnabled: boolean
  readonly volume: number
  readonly startWithWindows: boolean
}

export interface AppRuntime {
  readonly id: DesktopAppId
  readonly port: number
  readonly status: "stopped" | "starting" | "ready" | "degraded"
  readonly pid?: number
}

export interface GateResult {
  readonly gateId: GateId
  readonly success: boolean
  readonly durationMs: number
  readonly output: readonly string[]
}

export interface DoctorCheck {
  readonly id: "workspace" | "node" | "pnpm" | "git"
  readonly ok: boolean
  readonly value: string
}

export interface WorkspacePulse {
  readonly branch: string
  readonly changedFiles: number
  readonly clean: boolean
}
