export type CapsuleKind = "human" | "agent"
export type AgentPolicy = "human" | "agent-safe" | "agent-full"
export type AgentCapability = "page.read" | "page.click" | "page.type" | "files.read" | "files.write" | "credentials.write" | "account.delete" | "purchase.submit" | "publish.submit"
export type SearchProvider = { kind: "duckduckgo" | "google" } | { kind: "custom"; template: string }
export type BrowserTabStatus = "loading" | "ready" | "suspended" | "failed"

export interface Capsule {
  id: string
  name: string
  kind: CapsuleKind
  policy: AgentPolicy
  searchProvider: SearchProvider
  cacheMode: "persistent" | "memory"
  groupId: string | null
}

export interface BrowserTab {
  id: string
  capsuleId: string
  url: string
  title: string
  status: BrowserTabStatus
  pinnedLive: boolean
  active: boolean
  lastActiveAt: string
}

export interface BrowserDownload {
  id: string
  capsuleId: string
  url: string
  filename: string
  state: "progressing" | "completed" | "cancelled" | "failed"
  createdAt: string
}

export interface SafeLibrary {
  bookmarks: Array<{ url: string; title: string }>
  notes: Array<{ id: string; text: string }>
  savedTabs: string[]
}

const urlScheme = /^[a-z][a-z\d+.-]*:/i
const hostLike = /^(?:localhost|127\.0\.0\.1|\[::1\]|[a-z\d-]+(?:\.[a-z\d-]+)+)(?::\d+)?(?:\/|$)/i

export function navigationTarget(input: string, provider: SearchProvider): string {
  const value = input.trim()
  if (!value) throw new Error("Navigation input is empty")
  if (hostLike.test(value)) return `${/^localhost|^127\.|^\[::1\]/i.test(value) ? "http" : "https"}://${value}`
  if (urlScheme.test(value)) {
    const target = new URL(value)
    if (!["http:", "https:"].includes(target.protocol)) throw new Error("Unsupported navigation protocol")
    return target.toString()
  }
  const query = encodeURIComponent(value)
  if (provider.kind === "google") return `https://www.google.com/search?q=${query}`
  if (provider.kind === "custom") {
    if (!provider.template.startsWith("https://") || !provider.template.includes("{query}")) throw new Error("Invalid custom search provider")
    return provider.template.replace("{query}", query)
  }
  return `https://duckduckgo.com/?q=${query}`
}

const safeCapabilities = new Set<AgentCapability>(["page.read", "page.click", "page.type", "files.read", "files.write"])

export function canUseAgentCapability(policy: AgentPolicy, capability: AgentCapability): boolean {
  if (policy === "agent-full") return true
  return policy === "agent-safe" && safeCapabilities.has(capability)
}

export function canAgentBootstrapCapsule(kind: CapsuleKind, policy: AgentPolicy): boolean {
  return kind === "agent" && policy === "agent-safe"
}

export function automationCapabilityForTarget(action: "page.click" | "page.type", target: { inputType: string; autocomplete: string; intent: string }): AgentCapability {
  const inputType = target.inputType.toLowerCase()
  const autocomplete = target.autocomplete.toLowerCase()
  const intent = target.intent.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
  if (action === "page.type" && (inputType === "password" || /(?:current|new)-password|cc-number|one-time-code/.test(autocomplete))) return "credentials.write"
  if (/\b(?:delet\w*|remov\w*|destroy\w*|exclu\w*|apag\w*|encerr\w* conta)\b/.test(intent)) return "account.delete"
  if (/\b(?:buy|purchase\w*|checkout|pay|place order|order now|compr\w*|pag\w*|finalizar pedido)\b/.test(intent)) return "purchase.submit"
  if (/\b(?:publish|post|send publicly|publicar|postar|enviar publicamente)\b/.test(intent)) return "publish.submit"
  if (action === "page.click" && (!intent || /^(?:confirm(?:ar)?|yes|sim|ok|approve|aprovar|continue|continuar|proceed|prosseguir)$/i.test(intent))) return "publish.submit"
  return action
}

export function mergeSafeLibrary(left: SafeLibrary, right: SafeLibrary): SafeLibrary {
  const bookmarks = new Map(left.bookmarks.map((item) => [item.url, item]))
  for (const item of right.bookmarks) if (!bookmarks.has(item.url)) bookmarks.set(item.url, item)
  const notes = new Map(left.notes.map((item) => [item.id, item]))
  for (const item of right.notes) if (!notes.has(item.id)) notes.set(item.id, item)
  return {
    bookmarks: [...bookmarks.values()],
    notes: [...notes.values()],
    savedTabs: [...new Set([...left.savedTabs, ...right.savedTabs])],
  }
}

export function tabsToSuspend(tabs: readonly BrowserTab[], liveLimit = 8): string[] {
  if (!Number.isInteger(liveLimit) || liveLimit < 1) throw new Error("Live tab limit must be positive")
  const live = tabs.filter((tab) => tab.status !== "suspended")
  const needed = Math.max(0, live.length - liveLimit)
  return live
    .filter((tab) => !tab.active && !tab.pinnedLive)
    .sort((left, right) => left.lastActiveAt.localeCompare(right.lastActiveAt))
    .slice(0, needed)
    .map((tab) => tab.id)
}

export function capsuleQuotaState(usedMiB: number, softLimitMiB: number): { level: "ok" | "warning"; canAutoDelete: false } {
  if (usedMiB < 0 || softLimitMiB <= 0) throw new Error("Invalid cache quota")
  return { level: usedMiB >= softLimitMiB ? "warning" : "ok", canAutoDelete: false }
}
