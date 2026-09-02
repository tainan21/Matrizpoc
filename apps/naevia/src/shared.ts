export type AgentPolicy = "human" | "agent-safe" | "agent-full"

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

export interface NaeviaBridge {
  snapshot(): Promise<BrowserSnapshot>
  createCapsule(name: string, policy: AgentPolicy): Promise<BrowserSnapshot>
  activateCapsule(capsuleId: string): Promise<BrowserSnapshot>
  createTab(capsuleId: string): Promise<BrowserSnapshot>
  activateTab(tabId: string): Promise<BrowserSnapshot>
  navigate(tabId: string, input: string): Promise<BrowserSnapshot>
  setPanels(state: { side: "none" | "store" | "workbench"; terminal: boolean }): Promise<void>
  subscribe(listener: (snapshot: BrowserSnapshot) => void): () => void
}
