export type AgentPolicy = "human" | "agent-safe" | "agent-full"
export type BrowserCommand = "back" | "forward" | "reload" | "stop" | "devtools"

export interface CapsuleView {
  readonly id: string
  readonly name: string
  readonly policy: AgentPolicy
}

export interface TabView {
  readonly id: string
  readonly capsuleId: string
  readonly title: string
  readonly url: string
  readonly active: boolean
  readonly loading: boolean
}

export interface BrowserSnapshot {
  readonly capsules: readonly CapsuleView[]
  readonly tabs: readonly TabView[]
  readonly activeCapsuleId: string
  readonly activeTabId: string
}

export interface TerminalSessionView {
  readonly id: string
  readonly pid: number
  readonly status: "running" | "exited"
  readonly lines: readonly string[]
  readonly exitCode: number | null
}

export interface StoreProductView {
  readonly productId: string
  readonly name: string
  readonly edition: string
  readonly state: "active" | "unavailable" | "retired"
  readonly version: string | null
}

export interface DownloadView {
  readonly id: string
  readonly name: string
  readonly status: "progress" | "completed" | "cancelled" | "failed"
  readonly receivedBytes: number
  readonly totalBytes: number
  readonly createdAt: string
}

export interface LegacyImportPreview {
  readonly available: boolean
  readonly sourceLabel: string
  readonly capsuleCount: number
  readonly tabCount: number
  readonly reason?: string
  readonly confirmationToken?: string
}

export interface LegacyImportStatus {
  readonly canRollback: boolean
  readonly importedAt?: string
  readonly message: string
}

export interface NaeviaBridge {
  snapshot(): Promise<BrowserSnapshot>
  createCapsule(name: string, policy: AgentPolicy): Promise<BrowserSnapshot>
  activateCapsule(capsuleId: string): Promise<BrowserSnapshot>
  createTab(capsuleId: string): Promise<BrowserSnapshot>
  activateTab(tabId: string): Promise<BrowserSnapshot>
  closeTab(tabId: string): Promise<BrowserSnapshot>
  browserCommand(tabId: string, command: BrowserCommand): Promise<void>
  setKillSwitch(enabled: boolean): Promise<boolean>
  navigate(tabId: string, input: string): Promise<BrowserSnapshot>
  setPanels(state: { side: "none" | "store" | "workbench" | "library" | "migration"; terminal: boolean }): Promise<void>
  terminalSessions(): Promise<readonly TerminalSessionView[]>
  createTerminal(): Promise<readonly TerminalSessionView[]>
  writeTerminal(sessionId: string, input: string): Promise<void>
  interruptTerminal(sessionId: string): Promise<void>
  closeTerminal(sessionId: string): Promise<readonly TerminalSessionView[]>
  subscribeTerminals(listener: (sessions: readonly TerminalSessionView[]) => void): () => void
  storeCatalog(): Promise<readonly StoreProductView[]>
  downloads(): Promise<readonly DownloadView[]>
  showDownload(downloadId: string): Promise<void>
  subscribeDownloads(listener: (downloads: readonly DownloadView[]) => void): () => void
  legacyImportPreview(): Promise<LegacyImportPreview>
  confirmLegacyImport(confirmationToken: string): Promise<LegacyImportStatus>
  legacyImportStatus(): Promise<LegacyImportStatus>
  rollbackLegacyImport(): Promise<LegacyImportStatus>
  subscribe(listener: (snapshot: BrowserSnapshot) => void): () => void
}
