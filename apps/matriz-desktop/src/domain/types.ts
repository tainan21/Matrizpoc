export type DesktopAppId =
  | "matriz-hub"
  | "spot"
  | "matriz-admin"
  | "seumei"
  | "contracts"
  | "willdash"
  | "matriz-workbench"
  | "sites"
  | "matrizlib"

export type GateId = "typecheck" | "lint" | "test:smoke" | "prisma:validate"
export type QuickTargetId = "workspace" | "terminal" | "hub" | "matrizlib" | "workbench"
export type PortState = "external" | "starting" | "ready" | "degraded"
export type TerminalStatus = "starting" | "running" | "succeeded" | "failed" | "exited"
export type ManagedOperationId =
  | `app.${DesktopAppId}.web`
  | "app.matriz-admin.native.build"
  | "app.matriz-admin.native.install"
  | "app.matriz-admin.native.start"
  | `gate.${GateId}`

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

export interface TerminalSession {
  readonly id: string
  readonly title: string
  readonly kind: "shell" | "managed"
  readonly status: TerminalStatus
  readonly cwd: string
  readonly exitCode?: number
  readonly tail: string
}

export type TerminalEvent =
  | { readonly event: "output"; readonly data: TerminalChunk }
  | { readonly event: "state"; readonly data: TerminalSession }

export interface TerminalChunk {
  readonly sessionId: string
  readonly sequence: number
  readonly data: string
}

export interface NativeAppRuntime {
  readonly appId: "matriz-admin"
  readonly state: "not-built" | "built" | "installed" | "running"
  readonly version?: string
}
