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
  readonly workspacePath?: string
}

export interface AppRuntime {
  readonly id: DesktopAppId
  readonly port: number
  readonly status: "stopped" | "starting" | "ready" | "degraded"
  readonly pid?: number
}

export interface RuntimeInstance {
  readonly id: DesktopAppId
  readonly label: string
  readonly port: number
  readonly status: "stopped" | "starting" | "ready" | "degraded"
  readonly ownership: "none" | "managed" | "external"
  readonly pid?: number
  readonly sessionId?: string
  readonly endpoint: string
  readonly health: "offline" | "pending" | "healthy" | "unhealthy"
}

export interface RuntimeTarget {
  readonly appId: DesktopAppId
  readonly routePath: string
}

export interface PreviewBounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface PreviewState extends RuntimeTarget {
  readonly url: string
  readonly status: "loading" | "ready" | "error"
}

export interface ActivityEnvelope {
  readonly id: string
  readonly sequence: number
  readonly occurredAt: number
  readonly kind: string
  readonly severity: "info" | "success" | "warning" | "error"
  readonly title: string
  readonly detail?: string
  readonly appId?: DesktopAppId
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
  readonly operationId?: ManagedOperationId
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

export interface EnvironmentFile {
  readonly fileName: string
  readonly size: number
  readonly modifiedAt: number
}

export interface EnvironmentVariable {
  readonly key: string
  readonly value?: string
  readonly sensitive: boolean
  readonly source: string
}

export interface EnvironmentDocument {
  readonly appId: DesktopAppId
  readonly fileName: string
  readonly revision: string
  readonly variables: readonly EnvironmentVariable[]
  readonly missingRequired: readonly string[]
}

export interface EnvironmentSaveRequest {
  readonly appId: DesktopAppId
  readonly fileName: string
  readonly revision: string
  readonly variables: readonly { readonly key: string; readonly value?: string }[]
}

export interface ExplorerEntry {
  readonly name: string
  readonly relativePath: string
  readonly isDirectory: boolean
  readonly size: number
  readonly modifiedAt: number
  readonly extension?: string
}

export interface DirectoryListing {
  readonly appId: DesktopAppId
  readonly relativePath: string
  readonly entries: readonly ExplorerEntry[]
}

export interface FilePreview {
  readonly appId: DesktopAppId
  readonly relativePath: string
  readonly name: string
  readonly size: number
  readonly content: { readonly kind: "text" | "image" | "unsupported"; readonly value?: string }
}
