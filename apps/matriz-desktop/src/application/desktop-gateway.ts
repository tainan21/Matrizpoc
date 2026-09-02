import type {
  AppRuntime,
  ActivityEnvelope,
  DesktopAppId,
  DesktopSettings,
  TerminalReadiness,
  DesktopSnapshot,
  DoctorCheck,
  GateId,
  GateResult,
  KillManyRequest,
  KillRequest,
  ManagedOperationId,
  NativeAppRuntime,
  RuntimeInstance,
  RuntimeTarget,
  QuickTargetId,
  PreviewBounds,
  PreviewState,
  TerminalEvent,
  TerminalSession,
  WorkspacePulse,
  EnvironmentFile,
  EnvironmentDocument,
  EnvironmentSaveRequest,
  DirectoryListing,
  FilePreview,
  CommerceSnapshot,
  PackageActivationTarget,
  EnvironmentComparison,
  EnvironmentPromotionRequest,
  EnvironmentReferenceResult,
  RecoveryResult,
  RunbookDefinition,
  RunbookExecution,
  SystemPulse,
  NodeSweepScan,
  NodeSweepDeleteRequest,
  NodeSweepDeletion,
  HubStateSnapshot,
  SessionContext,
  GitSnapshot,
  GitSelectionRequest,
  GitDiffRequest,
  GitCommitRequest,
  GitDiff,
  GitRemoteRequest,
  UpdateInfo,
  UpdateProgress,
  InfrastructureSnapshot,
  InfrastructurePreviewRequest,
  InfrastructureActionPreview,
  InfrastructureServiceId,
  DatabaseMigrationSnapshot,
  DatabaseMigrationPreview,
  DatabaseSeedPreview,
  InfrastructureBackupRecord,
} from "../domain/types"

export interface DesktopGateway {
  snapshot(): Promise<DesktopSnapshot>
  runtimeSnapshot(): Promise<readonly RuntimeInstance[]>
  openRuntimeTarget(target: RuntimeTarget): Promise<void>
  restartRuntime(appId: DesktopAppId): Promise<TerminalSession>
  stopRuntime(appId: DesktopAppId): Promise<void>
  openPreview(target: RuntimeTarget, bounds: PreviewBounds): Promise<PreviewState>
  setPreviewBounds(bounds: PreviewBounds): Promise<void>
  navigatePreview(target: RuntimeTarget): Promise<PreviewState>
  previewBack(): Promise<void>
  previewForward(): Promise<void>
  reloadPreview(): Promise<void>
  closePreview(): Promise<void>
  activityHistory(): Promise<readonly ActivityEnvelope[]>
  subscribeActivity(listener: (event: ActivityEnvelope) => void): Promise<void>
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
  gitSnapshot(): Promise<GitSnapshot>
  gitDiff(request: GitDiffRequest): Promise<GitDiff>
  gitStage(request: GitSelectionRequest): Promise<GitSnapshot>
  gitUnstage(request: GitSelectionRequest): Promise<GitSnapshot>
  gitCommit(request: GitCommitRequest): Promise<GitSnapshot>
  gitRemote(request: GitRemoteRequest): Promise<GitSnapshot>
  systemPulse(): Promise<SystemPulse>
  getAwakeState(): Promise<boolean>
  setAwake(enabled: boolean): Promise<boolean>
  scanNodeModules(): Promise<NodeSweepScan>
  deleteNodeModules(request: NodeSweepDeleteRequest): Promise<NodeSweepDeletion>
  readResumeSession(): Promise<HubStateSnapshot>
  recordSessionContext(context: SessionContext): Promise<HubStateSnapshot>
  readSettings(): Promise<DesktopSettings>
  writeSettings(settings: DesktopSettings): Promise<DesktopSettings>
  checkUpdate(): Promise<UpdateInfo>
  downloadUpdate(listener: (event: UpdateProgress) => void): Promise<UpdateInfo>
  installUpdate(): Promise<void>
  infrastructureSnapshot(): Promise<InfrastructureSnapshot>
  previewInfrastructureAction(request: InfrastructurePreviewRequest): Promise<InfrastructureActionPreview>
  confirmInfrastructureAction(confirmationToken: string): Promise<InfrastructureSnapshot>
  infrastructureLogs(serviceId: InfrastructureServiceId): Promise<readonly string[]>
  infrastructureMigrations(): Promise<DatabaseMigrationSnapshot>
  previewInfrastructureMigrations(): Promise<DatabaseMigrationPreview>
  confirmInfrastructureMigrations(confirmationToken: string): Promise<DatabaseMigrationSnapshot>
  previewInfrastructureSeed(): Promise<DatabaseSeedPreview>
  confirmInfrastructureSeed(confirmationToken: string): Promise<void>
  infrastructureBackups(): Promise<readonly InfrastructureBackupRecord[]>
  hide(): Promise<void>
  quit(): Promise<void>
  terminalReadiness(): Promise<TerminalReadiness>
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
  stopNativeApp(): Promise<NativeAppRuntime>
  listEnvironments(appId: DesktopAppId): Promise<readonly EnvironmentFile[]>
  readEnvironment(appId: DesktopAppId, fileName: string): Promise<EnvironmentDocument>
  revealEnvironmentValue(appId: DesktopAppId, fileName: string, key: string): Promise<string>
  saveEnvironment(request: EnvironmentSaveRequest): Promise<EnvironmentDocument>
  compareEnvironments(appId: DesktopAppId, sourceFile: string, targetFile: string): Promise<EnvironmentComparison>
  promoteEnvironment(request: EnvironmentPromotionRequest): Promise<EnvironmentDocument>
  findEnvironmentReferences(appId: DesktopAppId, key: string): Promise<EnvironmentReferenceResult>
  listDirectory(appId: DesktopAppId, relativePath: string): Promise<DirectoryListing>
  previewFile(appId: DesktopAppId, relativePath: string): Promise<FilePreview>
  openResource(appId: DesktopAppId, relativePath: string): Promise<void>
  revealResource(appId: DesktopAppId, relativePath: string): Promise<void>
  openResourceInEditor(appId: DesktopAppId, relativePath: string): Promise<void>
  renameResource(appId: DesktopAppId, relativePath: string, newName: string): Promise<void>
  duplicateResource(appId: DesktopAppId, relativePath: string, newName: string): Promise<void>
  recycleResource(appId: DesktopAppId, relativePath: string): Promise<void>
  commerceSnapshot(): Promise<CommerceSnapshot>
  acquirePackage(packageId: string): Promise<CommerceSnapshot>
  installPackage(packageId: string, grantedPermissions: readonly string[]): Promise<CommerceSnapshot>
  uninstallPackage(packageId: string): Promise<CommerceSnapshot>
  repairPackage(packageId: string): Promise<CommerceSnapshot>
  activatePackage(packageId: string): Promise<PackageActivationTarget>
  recoverRuntime(appId: DesktopAppId): Promise<RecoveryResult>
  runbookCatalog(): Promise<readonly RunbookDefinition[]>
  runRunbook(runbookId: RunbookDefinition["id"], appId: DesktopAppId): Promise<RunbookExecution>
}
