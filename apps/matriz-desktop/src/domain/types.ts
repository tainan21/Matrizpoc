import type { OperationalThemeId } from "@matriz/design-system"

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
  readonly theme: OperationalThemeId
  readonly closeToTray: boolean
  readonly soundsEnabled: boolean
  readonly volume: number
  readonly startWithWindows: boolean
  readonly terminalDockOpen: boolean
  readonly terminalDockHeight: number
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
  readonly id: string
  readonly group: string
  readonly label: string
  readonly ok: boolean
  readonly severity: "success" | "warning" | "error"
  readonly value: string
  readonly description: string
  readonly expected?: string
  readonly remedyId?: string
}

export type DoctorRemedyTarget = "home" | "settings" | "agents" | "infra" | "store"

export interface DoctorRemedyPreview {
  readonly remedyId: string
  readonly title: string
  readonly summary: string
  readonly target: DoctorRemedyTarget
  readonly confirmationToken: string
  readonly expiresAt: number
}

export interface DoctorRemedyResult {
  readonly target: DoctorRemedyTarget
}

export interface WorkspacePulse {
  readonly branch: string
  readonly changedFiles: number
  readonly clean: boolean
}

export interface GitChange {
  readonly id: string
  readonly path: string
  readonly indexStatus: string
  readonly worktreeStatus: string
  readonly staged: boolean
  readonly hasWorktreeChanges: boolean
}

export interface GitCommitSummary {
  readonly id: string
  readonly shortId: string
  readonly subject: string
  readonly author: string
  readonly occurredAt: number
}

export interface GitSnapshot {
  readonly revision: string
  readonly branch: string
  readonly upstream?: string
  readonly ahead: number
  readonly behind: number
  readonly changes: readonly GitChange[]
  readonly recent: readonly GitCommitSummary[]
  readonly branches: readonly GitBranchSummary[]
  readonly reflog: readonly GitReflogEntry[]
}

export interface GitBranchSummary {
  readonly name: string
  readonly current: boolean
  readonly upstream?: string
}

export interface GitReflogEntry {
  readonly shortId: string
  readonly subject: string
  readonly occurredAt: number
}

export interface GitSelectionRequest {
  readonly revision: string
  readonly changeIds: readonly string[]
}

export interface GitDiffRequest {
  readonly revision: string
  readonly changeId: string
}

export interface GitCommitRequest {
  readonly revision: string
  readonly message: string
}

export interface GitRemoteRequest {
  readonly revision: string
  readonly action: "fetch" | "pull" | "push"
}

export interface GitBranchRequest {
  readonly revision: string
  readonly action: "create" | "switch"
  readonly name: string
}

export interface GitDiff {
  readonly changeId: string
  readonly staged: boolean
  readonly lines: readonly string[]
  readonly truncated: boolean
}

export type HubArea = "home" | "ports" | "apps" | "workspace" | "agents" | "environments" | "infra" | "git" | "terminal" | "actions" | "doctor" | "settings"
export type HubFeatureId = "node-sweep" | "system-pulse" | "matriz-awake" | "resume-session"

export interface SystemPulse {
  readonly cpuUsage: number
  readonly cpuModel: string
  readonly usedMemoryBytes: number
  readonly totalMemoryBytes: number
  readonly availableMemoryBytes: number
  readonly uptimeSeconds: number
  readonly windowsVersion: string
  readonly hostname?: string
  readonly diskFreeBytes?: number
  readonly diskUsedBytes?: number
  readonly processCount: number
  readonly temperatureCelsius: number | null
}

export interface NodeSweepCandidate {
  readonly appId: DesktopAppId
  readonly projectName: string
  readonly path: string
  readonly lastUsedAt: number
  readonly packageManager?: string
  readonly sizeBytes: number
}

export interface NodeSweepScan {
  readonly scanId: string
  readonly candidates: readonly NodeSweepCandidate[]
  readonly potentialBytes: number
}

export interface NodeSweepDeleteRequest { readonly scanId: string; readonly appIds: readonly DesktopAppId[] }
export interface NodeSweepDeleteResult { readonly appId: DesktopAppId; readonly deleted: boolean; readonly recoveredBytes: number; readonly error?: string }
export interface NodeSweepDeletion { readonly results: readonly NodeSweepDeleteResult[]; readonly recoveredBytes: number }

export interface SessionContext { readonly area: HubArea; readonly appId?: DesktopAppId; readonly terminalCwd?: string }
export interface ResumeSession extends SessionContext { readonly updatedAt: number }
export interface HubStateSnapshot { readonly workspacePath: string; readonly resume?: ResumeSession; readonly lastUsedAt: Readonly<Record<string, number>> }

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
  | { readonly event: "closed"; readonly data: { readonly sessionId: string } }

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

export interface EnvironmentComparisonEntry {
  readonly key: string
  readonly sensitive: boolean
  readonly status: "equal" | "different" | "missingSource" | "missingTarget"
  readonly sourceValue?: string
  readonly targetValue?: string
}

export interface EnvironmentComparison {
  readonly appId: DesktopAppId
  readonly sourceFile: string
  readonly targetFile: string
  readonly targetRevision: string
  readonly entries: readonly EnvironmentComparisonEntry[]
}

export interface EnvironmentPromotionRequest {
  readonly appId: DesktopAppId
  readonly sourceFile: string
  readonly targetFile: string
  readonly targetRevision: string
  readonly keys: readonly string[]
}

export interface EnvironmentReferenceMatch {
  readonly relativePath: string
  readonly line: number
  readonly excerpt: string
}

export interface EnvironmentReferenceResult {
  readonly appId: DesktopAppId
  readonly key: string
  readonly scannedFiles: number
  readonly truncated: boolean
  readonly matches: readonly EnvironmentReferenceMatch[]
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

export interface WalletTransaction {
  readonly id: string
  readonly occurredAt: number
  readonly amount: number
  readonly kind: string
  readonly title: string
  readonly packageId?: string
}

export interface StorePackage {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly developer: string
  readonly version: string
  readonly category: string
  readonly appId: DesktopAppId | "matriz-desktop"
  readonly price: number
  readonly permissions: readonly string[]
  readonly compatibility: string
  readonly owned: boolean
  readonly installed: boolean
  readonly trustStatus?: "verified" | "changed" | "missing"
  readonly receipt?: PackageReceipt
  readonly builtIn?: boolean
  readonly status?: string
}

export interface PackageReceipt {
  readonly packageId: string
  readonly version: string
  readonly manifestDigest: string
  readonly grantedPermissions: readonly string[]
  readonly installedAt: number
}

export interface CommerceSnapshot {
  readonly wallet: { readonly balance: number; readonly currency: "M"; readonly transactions: readonly WalletTransaction[] }
  readonly packages: readonly StorePackage[]
}

export interface RuntimePackageActivationTarget extends RuntimeTarget {
  readonly kind: "runtime"
  readonly packageId: string
  readonly operationId: `app.${DesktopAppId}.web`
}

export interface TerminalReadiness {
  readonly ready: boolean
  readonly workspacePath?: string
  readonly shellPath?: string
  readonly shellLabel?: string
  readonly conptyAvailable: boolean
  readonly sessionCount: number
  readonly sessionLimit: number
  readonly reason?: string
}

export interface UpdateInfo {
  readonly state: "current" | "available" | "downloaded" | "unavailable"
  readonly currentVersion: string
  readonly version?: string
  readonly notes?: string
  readonly sizeBytes?: number
  readonly reason?: string
}

export interface UpdateProgress {
  readonly downloadedBytes: number
  readonly totalBytes?: number
}

export type InfrastructureServiceId = "postgres" | "garnet" | "nats"
export type InfrastructureTargetId = "stack" | InfrastructureServiceId
export type InfrastructureActionId = "install" | "start" | "stop" | "restart" | "provision" | "backup" | "restore"
export type InfrastructureState = "not_installed" | "installing" | "stopped" | "starting" | "healthy" | "degraded" | "drifted" | "failed" | "external_unowned"

export interface InfrastructureServiceSnapshot {
  readonly id: InfrastructureServiceId
  readonly displayName: string
  readonly version: string
  readonly ports: readonly number[]
  readonly state: InfrastructureState
  readonly message: string
}

export interface InfrastructureSnapshot {
  readonly revision: string
  readonly root: string
  readonly services: readonly InfrastructureServiceSnapshot[]
}

export interface InfrastructurePreviewRequest {
  readonly targetId: InfrastructureTargetId
  readonly actionId: InfrastructureActionId
  readonly revision: string
  readonly backupId?: string
}

export interface InfrastructureActionPreview {
  readonly confirmationToken: string
  readonly targetId: InfrastructureTargetId
  readonly actionId: InfrastructureActionId
  readonly title: string
  readonly impact: readonly string[]
  readonly expiresAt: number
}

export interface MigrationLedgerComparison {
  readonly state: "clean" | "pending" | "drifted" | "failed"
  readonly pending: readonly string[]
  readonly altered: readonly string[]
  readonly unexpected: readonly string[]
  readonly failed: readonly string[]
}

export interface DatabaseMigrationSnapshot {
  readonly state: MigrationLedgerComparison["state"]
  readonly schemas: readonly { readonly schema: string; readonly ledger: MigrationLedgerComparison }[]
}

export interface DatabaseMigrationPreview {
  readonly confirmationToken: string
  readonly expiresAt: number
  readonly title: string
  readonly impact: readonly string[]
  readonly schemas: readonly string[]
}

export interface DatabaseSeedPreview {
  readonly confirmationToken: string
  readonly expiresAt: number
  readonly title: string
  readonly impact: readonly string[]
}

export interface EventQueueDiagnostic {
  readonly schema: string
  readonly queue: "outbox" | "inbox"
  readonly available: boolean
  readonly pending: number
  readonly retries: number
  readonly deadLetters: number
  readonly oldestAt?: string
}

export interface InfrastructureBackupRecord {
  readonly id: string
  readonly createdAt: number
  readonly bytes: number
  readonly sha256: string
  readonly integrity: "verified" | "invalid"
}

export interface ControlPackageActivationTarget {
  readonly kind: "control"
  readonly packageId: string
  readonly view: "hub"
  readonly featureId: HubFeatureId
}

export type PackageActivationTarget = RuntimePackageActivationTarget | ControlPackageActivationTarget

export interface RecoveryResult {
  readonly appId: DesktopAppId
  readonly status: "ready" | "diagnoseOnly"
  readonly sessionId?: string
}

export interface RunbookDefinition {
  readonly id: "validate-environment" | "recover-open" | "apply-visualize"
  readonly label: string
  readonly description: string
  readonly steps: readonly string[]
}

export interface RunbookStepResult {
  readonly stepId: string
  readonly status: "completed" | "failed" | "available"
  readonly detail: string
}

export interface RunbookExecution {
  readonly runbookId: RunbookDefinition["id"]
  readonly appId: DesktopAppId
  readonly status: "completed" | "failed"
  readonly steps: readonly RunbookStepResult[]
  readonly target?: RuntimeTarget
}
