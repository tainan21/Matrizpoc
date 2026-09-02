import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { app, BrowserWindow, ipcMain, session, WebContentsView } from "electron"

import { navigationTarget } from "../src/navigation.js"
import type { AgentPolicy, BrowserSnapshot, CapsuleView, TabView } from "../src/shared.js"

const here = dirname(fileURLToPath(import.meta.url))
const documentVersion = 1
const views = new Map<string, WebContentsView>()
let mainWindow: BrowserWindow | undefined
let repository: BrowserRepository
let activeViewId = ""
let panelState = { side: "none" as "none" | "store" | "workbench", terminal: false }

if (process.env.NAEVIA_USER_DATA_DIR) app.setPath("userData", process.env.NAEVIA_USER_DATA_DIR)

class BrowserRepository {
  private snapshotValue?: BrowserSnapshot
  constructor(private readonly path: string) {}

  async snapshot() {
    if (!this.snapshotValue) this.snapshotValue = await this.read()
    return structuredClone(this.snapshotValue)
  }

  async mutate(change: (snapshot: MutableSnapshot) => void) {
    const snapshot = await this.snapshot()
    const mutable = structuredClone(snapshot) as MutableSnapshot
    change(mutable)
    await this.write(mutable)
    this.snapshotValue = mutable
    return this.snapshot()
  }

  private async read(): Promise<BrowserSnapshot> {
    try {
      const parsed = JSON.parse(await readFile(this.path, "utf8")) as { version: number; snapshot: BrowserSnapshot }
      if (parsed.version !== documentVersion) throw new Error("unsupported state")
      return parsed.snapshot
    } catch {
      const capsuleId = randomUUID()
      const tabId = randomUUID()
      return {
        capsules: [{ id: capsuleId, name: "Pessoal", policy: "human" }],
        tabs: [{ id: tabId, capsuleId, title: "Nova aba", url: "https://duckduckgo.com/", active: true, loading: false }],
        activeCapsuleId: capsuleId,
        activeTabId: tabId,
      }
    }
  }

  private async write(snapshot: BrowserSnapshot) {
    await mkdir(dirname(this.path), { recursive: true })
    const temporary = `${this.path}.${randomUUID()}.tmp`
    await writeFile(temporary, `${JSON.stringify({ version: documentVersion, snapshot }, null, 2)}\n`, { flag: "wx" })
    await rename(temporary, this.path)
  }
}

interface MutableSnapshot {
  capsules: CapsuleView[]
  tabs: TabView[]
  activeCapsuleId: string
  activeTabId: string
}

function partition(capsuleId: string) {
  if (!/^[a-f0-9-]{36}$/.test(capsuleId)) throw new Error("Cápsula inválida")
  return `persist:naevia-${capsuleId}`
}

function secureSession(partitionName: string) {
  const isolated = session.fromPartition(partitionName)
  isolated.setPermissionCheckHandler(() => false)
  isolated.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  isolated.setDevicePermissionHandler(() => false)
  return isolated
}

async function ensureView(tab: TabView) {
  const current = views.get(tab.id)
  if (current) return current
  const partitionName = partition(tab.capsuleId)
  secureSession(partitionName)
  const view = new WebContentsView({ webPreferences: { partition: partitionName, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true } })
  view.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  view.webContents.on("will-navigate", (event, url) => {
    try { if (!['http:', 'https:'].includes(new URL(url).protocol)) event.preventDefault() } catch { event.preventDefault() }
  })
  view.webContents.on("will-attach-webview", (event) => event.preventDefault())
  view.webContents.on("did-start-loading", () => void updateTab(tab.id, { loading: true }))
  view.webContents.on("did-stop-loading", () => void updateTab(tab.id, { loading: false, url: view.webContents.getURL() }))
  view.webContents.on("page-title-updated", (event, title) => { event.preventDefault(); void updateTab(tab.id, { title: title.slice(0, 120) || "Nova aba" }) })
  views.set(tab.id, view)
  await view.webContents.loadURL(tab.url)
  return view
}

async function updateTab(tabId: string, values: Partial<TabView>) {
  const snapshot = await repository.mutate((state) => {
    const index = state.tabs.findIndex((tab) => tab.id === tabId)
    if (index >= 0) state.tabs[index] = { ...state.tabs[index], ...values }
  })
  publish(snapshot)
}

function publish(snapshot: BrowserSnapshot) {
  const window = mainWindow
  if (window && !window.isDestroyed()) window.webContents.send("naevia:snapshot", snapshot)
}

async function showActive(snapshot: BrowserSnapshot) {
  const window = mainWindow
  if (!window || window.isDestroyed()) return
  const tab = snapshot.tabs.find((item) => item.id === snapshot.activeTabId)
  if (!tab) throw new Error("Aba ativa inválida")
  for (const view of views.values()) window.contentView.removeChildView(view)
  const view = await ensureView(tab)
  if (window.isDestroyed()) return
  activeViewId = tab.id
  window.contentView.addChildView(view)
  layout()
}

function layout() {
  if (!mainWindow) return
  const active = views.get(activeViewId)
  if (!active) return
  const [width, height] = mainWindow.getContentSize()
  const side = panelState.side === "none" ? 0 : 340
  const bottom = panelState.terminal ? 260 : 0
  active.setBounds({ x: 52, y: 104, width: Math.max(1, width - 52 - side), height: Math.max(1, height - 104 - bottom) })
}

function text(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error(`${label} inválido`)
  return value.trim()
}

function policy(value: unknown): AgentPolicy {
  if (value !== "human" && value !== "agent-safe" && value !== "agent-full") throw new Error("Política inválida")
  return value
}

function registerIpc() {
  ipcMain.handle("naevia:snapshot", () => repository.snapshot())
  ipcMain.handle("naevia:capsule:create", async (_event, input: unknown) => {
    const value = input as Record<string, unknown>
    const name = text(value?.name, "Nome", 50)
    const selectedPolicy = policy(value?.policy)
    const capsule: CapsuleView = { id: randomUUID(), name, policy: selectedPolicy }
    return repository.mutate((state) => { state.capsules.push(capsule) })
  })
  ipcMain.handle("naevia:tab:create", async (_event, input: unknown) => {
    const capsuleId = text((input as Record<string, unknown>)?.capsuleId, "Cápsula", 36)
    const snapshot = await repository.snapshot()
    if (!snapshot.capsules.some((item) => item.id === capsuleId)) throw new Error("Cápsula desconhecida")
    const tab: TabView = { id: randomUUID(), capsuleId, title: "Nova aba", url: "https://duckduckgo.com/", active: true, loading: false }
    const changed = await repository.mutate((state) => {
      state.tabs = state.tabs.map((item) => ({ ...item, active: false }))
      state.tabs.push(tab); state.activeCapsuleId = capsuleId; state.activeTabId = tab.id
    })
    await showActive(changed); publish(changed); return changed
  })
  ipcMain.handle("naevia:tab:activate", async (_event, input: unknown) => {
    const tabId = text((input as Record<string, unknown>)?.tabId, "Aba", 36)
    const current = await repository.snapshot()
    const tab = current.tabs.find((item) => item.id === tabId)
    if (!tab) throw new Error("Aba desconhecida")
    const changed = await repository.mutate((state) => {
      state.tabs = state.tabs.map((item) => ({ ...item, active: item.id === tabId }))
      state.activeTabId = tabId; state.activeCapsuleId = tab.capsuleId
    })
    await showActive(changed); publish(changed); return changed
  })
  ipcMain.handle("naevia:tab:navigate", async (_event, input: unknown) => {
    const value = input as Record<string, unknown>
    const tabId = text(value?.tabId, "Aba", 36)
    const url = navigationTarget(text(value?.input, "Endereço", 2_048))
    const snapshot = await repository.snapshot()
    if (snapshot.activeTabId !== tabId) throw new Error("Somente a aba ativa pode navegar")
    await (await ensureView(snapshot.tabs.find((tab) => tab.id === tabId)!)).webContents.loadURL(url)
    return repository.snapshot()
  })
  ipcMain.handle("naevia:layout", async (_event, input: unknown) => {
    const value = input as Record<string, unknown>
    if (!['none', 'store', 'workbench'].includes(String(value?.side)) || typeof value?.terminal !== "boolean") throw new Error("Layout inválido")
    panelState = { side: value.side as typeof panelState.side, terminal: value.terminal }
    layout()
  })
}

async function createWindow() {
  repository = new BrowserRepository(join(app.getPath("userData"), "browser-state.json"))
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 640, backgroundColor: "#08070c", title: "NAEVIA",
    webPreferences: { preload: join(here, "preload.cjs"), sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true },
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault())
  mainWindow.on("resize", layout)
  mainWindow.on("closed", () => { for (const view of views.values()) view.webContents.close(); views.clear(); mainWindow = undefined })
  const devUrl = process.env.NAEVIA_DEV_URL
  await (devUrl ? mainWindow.loadURL(devUrl) : mainWindow.loadFile(join(here, "../../dist/index.html")))
  const snapshot = await repository.snapshot()
  await showActive(snapshot)
}

app.whenReady().then(async () => { registerIpc(); await createWindow() })
app.on("window-all-closed", () => app.quit())
