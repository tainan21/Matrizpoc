export interface CapsulePayload { id: string; name: string; policy: "human" | "agent-safe" | "agent-full"; cacheMode: "persistent" | "memory" }
export interface BrowserTabPayload { id: string; capsuleId: string; title: string; url: string; active: boolean; status: "loading" | "ready" | "suspended" | "failed"; pinnedLive: boolean }
export interface WorkspaceFileViewModel { projectId: string; path: string; content: string; version: string; modifiedAt: string; bytes: number }

export interface CapsuleViewModel {
  id: string
  name: string
  selected: boolean
  status: string
  cache: string
  tone: "ok" | "warning" | "danger"
}

export function toCapsuleViewModel(capsule: CapsulePayload, state: { tabs: number; cacheMiB: number; selected: boolean }): CapsuleViewModel {
  const policy = capsule.policy.toUpperCase()
  return {
    id: capsule.id,
    name: capsule.name,
    selected: state.selected,
    status: `${policy} · ISOLADA · ${state.tabs} ${state.tabs === 1 ? "ABA" : "ABAS"}`,
    cache: `CACHE ${state.cacheMiB} MB · ${capsule.cacheMode === "persistent" ? "PERSISTENTE" : "MEMÓRIA"}`,
    tone: capsule.policy === "agent-full" ? "danger" : capsule.policy === "agent-safe" ? "warning" : "ok",
  }
}

export interface BrowserTabViewModel { id: string; capsuleId: string; title: string; url: string; active: boolean; status: BrowserTabPayload["status"]; pinnedLive: boolean }
export function toBrowserTabViewModel(tab: BrowserTabPayload): BrowserTabViewModel { return { id: tab.id, capsuleId: tab.capsuleId, title: tab.title, url: tab.url, active: tab.active, status: tab.status, pinnedLive: tab.pinnedLive } }
export function toWorkspaceFileViewModel(value: WorkspaceFileViewModel): WorkspaceFileViewModel { return { ...value } }
