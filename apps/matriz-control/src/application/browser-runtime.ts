import { randomUUID } from "node:crypto"
import { canUseAgentCapability, navigationTarget, type AgentCapability, type AgentPolicy, type BrowserDownload, type BrowserTab, type Capsule } from "../domain/browser"

export interface BrowserRepository {
  listCapsules(): Promise<Capsule[]>
  saveCapsule(capsule: Capsule): Promise<void>
  getCapsule(id: string): Promise<Capsule | undefined>
  listTabs(capsuleId: string): Promise<BrowserTab[]>
  saveTab(tab: BrowserTab): Promise<void>
  deleteTab(tabId: string): Promise<void>
  saveDownload(download: BrowserDownload): Promise<void>
  searchLibrary?(capsuleId: string, query: string): Promise<Array<{ kind: "bookmark" | "note"; title: string; url: string | null }>>
}

export class MemoryBrowserRepository implements BrowserRepository {
  private readonly capsules = new Map<string, Capsule>()
  private readonly tabs = new Map<string, BrowserTab>()
  async listCapsules(): Promise<Capsule[]> { return [...this.capsules.values()].map((item) => structuredClone(item)) }
  async saveCapsule(capsule: Capsule): Promise<void> { this.capsules.set(capsule.id, structuredClone(capsule)) }
  async getCapsule(id: string): Promise<Capsule | undefined> { const item = this.capsules.get(id); return item ? structuredClone(item) : undefined }
  async listTabs(capsuleId: string): Promise<BrowserTab[]> { return [...this.tabs.values()].filter((item) => item.capsuleId === capsuleId).map((item) => structuredClone(item)) }
  async saveTab(tab: BrowserTab): Promise<void> { this.tabs.set(tab.id, structuredClone(tab)) }
  async deleteTab(tabId: string): Promise<void> { this.tabs.delete(tabId) }
  async saveDownload(_download: BrowserDownload): Promise<void> {}
}

export type BrowserCommand =
  | { type: "capsule.create"; name: string; kind: Capsule["kind"]; policy: AgentPolicy }
  | { type: "capsule.list" }
  | { type: "capsule.delegate"; capsuleId: string; policy: Exclude<AgentPolicy, "human"> }
  | { type: "tab.open"; capsuleId: string; input: string }
  | { type: "tab.list"; capsuleId: string }

export class BrowserRuntime {
  private readonly repository: BrowserRepository
  private readonly now: () => string
  private readonly id: (prefix: string) => string

  constructor(options: { repository: BrowserRepository; now?: () => string; id?: (prefix: string) => string }) {
    this.repository = options.repository
    this.now = options.now ?? (() => new Date().toISOString())
    this.id = options.id ?? ((prefix) => `${prefix}_${randomUUID()}`)
  }

  async execute(command: Extract<BrowserCommand, { type: "capsule.create" }>): Promise<Capsule>
  async execute(command: Extract<BrowserCommand, { type: "capsule.list" }>): Promise<Capsule[]>
  async execute(command: Extract<BrowserCommand, { type: "capsule.delegate" }>): Promise<Capsule>
  async execute(command: Extract<BrowserCommand, { type: "tab.open" }>): Promise<BrowserTab>
  async execute(command: Extract<BrowserCommand, { type: "tab.list" }>): Promise<BrowserTab[]>
  async execute(command: BrowserCommand): Promise<Capsule | Capsule[] | BrowserTab | BrowserTab[]>
  async execute(command: BrowserCommand): Promise<Capsule | Capsule[] | BrowserTab | BrowserTab[]> {
    if (command.type === "capsule.list") return this.repository.listCapsules()
    if (command.type === "capsule.create") {
      const name = command.name.trim()
      if (!name) throw new Error("Capsule name is required")
      if (command.kind === "human" && command.policy !== "human") throw new Error("Human capsules start without agent delegation")
      if (command.kind === "agent" && command.policy === "human") throw new Error("Agent capsules require an agent policy")
      const capsule: Capsule = { id: this.id("capsule"), name, kind: command.kind, policy: command.policy, searchProvider: { kind: "duckduckgo" }, cacheMode: "persistent", groupId: null }
      await this.repository.saveCapsule(capsule)
      return capsule
    }
    const capsule = await this.repository.getCapsule(command.capsuleId)
    if (!capsule) throw new Error("Unknown capsule")
    if (command.type === "capsule.delegate") {
      const delegated = { ...capsule, policy: command.policy }
      await this.repository.saveCapsule(delegated)
      return delegated
    }
    if (command.type === "tab.list") return this.repository.listTabs(capsule.id)
    const existing = await this.repository.listTabs(capsule.id)
    for (const tab of existing.filter((item) => item.active)) await this.repository.saveTab({ ...tab, active: false })
    const tab: BrowserTab = {
      id: this.id("tab"),
      capsuleId: capsule.id,
      url: navigationTarget(command.input, capsule.searchProvider),
      title: "Nova aba",
      status: "loading",
      pinnedLive: false,
      active: true,
      lastActiveAt: this.now(),
    }
    await this.repository.saveTab(tab)
    return tab
  }

  async authorizeAgent(capsuleId: string, capability: AgentCapability): Promise<void> {
    const capsule = await this.repository.getCapsule(capsuleId)
    if (!capsule) throw new Error("Unknown capsule")
    if (capsule.kind === "human" && capsule.policy === "human") throw new Error("Human capsule is not delegated")
    if (!canUseAgentCapability(capsule.policy, capability)) throw new Error(`Capability ${capability} is blocked`)
  }
}
