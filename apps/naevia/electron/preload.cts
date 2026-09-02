import { contextBridge, ipcRenderer } from "electron"

type AgentPolicy = "human" | "agent-safe" | "agent-full"
interface BrowserSnapshot {
  readonly capsules: readonly { readonly id: string; readonly name: string; readonly policy: AgentPolicy }[]
  readonly tabs: readonly {
    readonly id: string
    readonly capsuleId: string
    readonly title: string
    readonly url: string
    readonly active: boolean
    readonly loading: boolean
  }[]
  readonly activeCapsuleId: string
  readonly activeTabId: string
}
interface TerminalSessionView { readonly id: string; readonly pid: number; readonly status: "running" | "exited"; readonly lines: readonly string[]; readonly exitCode: number | null }
interface StoreProductView { readonly productId: string; readonly name: string; readonly edition: string; readonly state: "active" | "unavailable" | "retired"; readonly version: string | null }

interface NaeviaBridge {
  snapshot(): Promise<BrowserSnapshot>
  createCapsule(name: string, policy: AgentPolicy): Promise<BrowserSnapshot>
  activateCapsule(capsuleId: string): Promise<BrowserSnapshot>
  createTab(capsuleId: string): Promise<BrowserSnapshot>
  activateTab(tabId: string): Promise<BrowserSnapshot>
  navigate(tabId: string, input: string): Promise<BrowserSnapshot>
  setPanels(state: { side: "none" | "store" | "workbench"; terminal: boolean }): Promise<void>
  terminalSessions(): Promise<readonly TerminalSessionView[]>
  createTerminal(): Promise<readonly TerminalSessionView[]>
  writeTerminal(sessionId: string, input: string): Promise<void>
  interruptTerminal(sessionId: string): Promise<void>
  closeTerminal(sessionId: string): Promise<readonly TerminalSessionView[]>
  subscribeTerminals(listener: (sessions: readonly TerminalSessionView[]) => void): () => void
  storeCatalog(): Promise<readonly StoreProductView[]>
  subscribe(listener: (snapshot: BrowserSnapshot) => void): () => void
}

const bridge: NaeviaBridge = {
  snapshot: () => ipcRenderer.invoke("naevia:snapshot"),
  createCapsule: (name, policy) => ipcRenderer.invoke("naevia:capsule:create", { name, policy }),
  activateCapsule: (capsuleId) => ipcRenderer.invoke("naevia:capsule:activate", { capsuleId }),
  createTab: (capsuleId) => ipcRenderer.invoke("naevia:tab:create", { capsuleId }),
  activateTab: (tabId) => ipcRenderer.invoke("naevia:tab:activate", { tabId }),
  navigate: (tabId, input) => ipcRenderer.invoke("naevia:tab:navigate", { tabId, input }),
  setPanels: (state) => ipcRenderer.invoke("naevia:layout", state),
  terminalSessions: () => ipcRenderer.invoke("naevia:terminal:list"),
  createTerminal: () => ipcRenderer.invoke("naevia:terminal:create"),
  writeTerminal: (sessionId, input) => ipcRenderer.invoke("naevia:terminal:write", { sessionId, input }),
  interruptTerminal: (sessionId) => ipcRenderer.invoke("naevia:terminal:interrupt", { sessionId }),
  closeTerminal: (sessionId) => ipcRenderer.invoke("naevia:terminal:close", { sessionId }),
  subscribeTerminals: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, sessions: readonly TerminalSessionView[]) => listener(sessions)
    ipcRenderer.on("naevia:terminal:sessions", handler)
    return () => ipcRenderer.off("naevia:terminal:sessions", handler)
  },
  storeCatalog: () => ipcRenderer.invoke("naevia:store:catalog"),
  subscribe: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: BrowserSnapshot) => listener(snapshot)
    ipcRenderer.on("naevia:snapshot", handler)
    return () => ipcRenderer.off("naevia:snapshot", handler)
  },
}

contextBridge.exposeInMainWorld("naevia", Object.freeze(bridge))
