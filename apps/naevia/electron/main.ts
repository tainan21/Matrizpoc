import { randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { app, BrowserWindow, ipcMain, session, shell, WebContentsView, type Session, type IpcMainInvokeEvent } from "electron"

import { navigationTarget } from "../src/navigation.js"
import { activateCapsule, closeTab } from "../src/browser-state.js"
import { storeProducts } from "../src/store-catalog.js"
import { MAX_DOWNLOAD_BYTES, safeDownloadName, validDownloadUrl } from "../src/downloads.js"
import { TerminalHost, terminalEnvironment, type TerminalProcess } from "./terminal-host.js"
import { LegacyImportService } from "./legacy-import-service.js"
import { BrowserRepository } from "./browser-repository.js"
import { assertTrustedShell, isShellUrl } from "./trusted-shell.js"
import { policyAllows } from "./capsule-policy.js"
import { openControlStore } from "./control-store-handoff.js"
import type { AgentPolicy, BrowserCommand, BrowserSnapshot, CapsuleView, TabView } from "../src/shared.js"

const here = dirname(fileURLToPath(import.meta.url))
const views = new Map<string, WebContentsView>()
let mainWindow: BrowserWindow | undefined
let shellUrl = ""
let repository: BrowserRepository
let activeViewId = ""
let panelState = { side: "none" as "none" | "store" | "workbench" | "library" | "migration", terminal: false }
let workbenchView: WebContentsView | undefined
let killSwitchEnabled = false
const terminalHost = new TerminalHost(spawnTerminalProcess)
const configuredDownloadSessions = new WeakSet<Session>()
const downloads = new Map<string, { view: import("../src/shared.js").DownloadView; path: string }>()
let downloadDirectory = ""
let legacyImport: LegacyImportService

if (process.env.NAEVIA_USER_DATA_DIR) app.setPath("userData", process.env.NAEVIA_USER_DATA_DIR)

function partition(capsuleId: string) {
  if (!/^[a-f0-9-]{36}$/.test(capsuleId)) throw new Error("Cápsula inválida")
  return `persist:naevia-${capsuleId}`
}

function secureSession(partitionName: string, selectedPolicy: AgentPolicy) {
  const isolated = session.fromPartition(partitionName)
  isolated.setPermissionCheckHandler(() => false)
  isolated.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  isolated.setDevicePermissionHandler(() => false)
  isolated.enableNetworkEmulation({ offline: killSwitchEnabled })
  configureDownloads(isolated, selectedPolicy)
  return isolated
}

function configureDownloads(isolated: Session, selectedPolicy: AgentPolicy) {
  if (configuredDownloadSessions.has(isolated)) return
  configuredDownloadSessions.add(isolated)
  isolated.on("will-download", (_event, item) => {
    if (!policyAllows(selectedPolicy, "downloads")) { item.cancel(); return }
    const source = item.getURL()
    const total = item.getTotalBytes()
    if (!validDownloadUrl(source) || total > MAX_DOWNLOAD_BYTES) { item.cancel(); return }
    const id = randomUUID()
    const name = safeDownloadName(item.getFilename())
    const path = join(downloadDirectory, `${id.slice(0, 8)}-${name}`)
    const view = { id, name, status: "progress" as const, receivedBytes: 0, totalBytes: Math.max(0, total), createdAt: new Date().toISOString() }
    downloads.set(id, { view, path })
    item.setSavePath(path)
    item.on("updated", () => {
      const receivedBytes = item.getReceivedBytes()
      if (receivedBytes > MAX_DOWNLOAD_BYTES) item.cancel()
      updateDownload(id, { receivedBytes, totalBytes: Math.max(0, item.getTotalBytes()) })
    })
    item.once("done", (_doneEvent, state) => updateDownload(id, { status: state === "completed" ? "completed" : state === "cancelled" ? "cancelled" : "failed", receivedBytes: item.getReceivedBytes() }))
    publishDownloads()
  })
}

function updateDownload(id: string, values: Partial<import("../src/shared.js").DownloadView>) {
  const current = downloads.get(id)
  if (!current) return
  downloads.set(id, { ...current, view: { ...current.view, ...values } })
  publishDownloads()
}

function publishDownloads() {
  const window = mainWindow
  if (window && !window.isDestroyed()) window.webContents.send("naevia:downloads", [...downloads.values()].map(({ view }) => view))
}

function ensureView(tab: TabView, selectedPolicy: AgentPolicy) {
  const current = views.get(tab.id)
  if (current) return current
  const partitionName = partition(tab.capsuleId)
  secureSession(partitionName, selectedPolicy)
  const view = new WebContentsView({ webPreferences: { partition: partitionName, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true } })
  view.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  view.webContents.on("will-navigate", (event, url) => {
    try { if (!['http:', 'https:'].includes(new URL(url).protocol)) event.preventDefault() } catch { event.preventDefault() }
  })
  view.webContents.on("will-attach-webview", (event) => event.preventDefault())
  view.webContents.on("did-start-loading", () => void updateTab(tab.id, { loading: true }))
  view.webContents.on("did-stop-loading", () => {
    const url = view.webContents.getURL()
    void updateTab(tab.id, { loading: false, ...(/^https?:\/\//i.test(url) ? { url } : {}) })
  })
  view.webContents.on("page-title-updated", (event, title) => { event.preventDefault(); void updateTab(tab.id, { title: title.slice(0, 120) || "Nova aba" }) })
  views.set(tab.id, view)
  // Attach the native surface without waiting for network completion. Stopping,
  // replacing or failing a navigation must not leave the tab detached forever.
  void view.webContents.loadURL(tab.url).catch(() => {
    // did-stop-loading publishes the state; the same view can navigate again.
  })
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

function showActive(snapshot: BrowserSnapshot) {
  const window = mainWindow
  if (!window || window.isDestroyed()) return
  const tab = snapshot.tabs.find((item) => item.id === snapshot.activeTabId)
  if (!tab) throw new Error("Aba ativa inválida")
  const capsule = snapshot.capsules.find((item) => item.id === tab.capsuleId)
  if (!capsule) throw new Error("Cápsula ativa inválida")
  for (const view of views.values()) window.contentView.removeChildView(view)
  const view = ensureView(tab, capsule.policy)
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
  if (workbenchView && panelState.side === "workbench") workbenchView.setBounds({ x: Math.max(52, width - 340), y: 104, width: 340, height: Math.max(1, height - 104 - bottom) })
}

async function ensureWorkbenchView() {
  if (workbenchView) return workbenchView
  const view = new WebContentsView({ webPreferences: { partition: "persist:naevia-workbench", sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true } })
  const allowed = (raw: string) => { try { const url = new URL(raw); return url.protocol === "http:" && url.hostname === "127.0.0.1" && url.port === "3005" } catch { return false } }
  view.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  view.webContents.on("will-navigate", (event, url) => { if (!allowed(url)) event.preventDefault() })
  view.webContents.on("will-attach-webview", (event) => event.preventDefault())
  try { await view.webContents.loadURL("http://127.0.0.1:3005/control") }
  catch (cause) { view.webContents.close(); throw cause }
  workbenchView = view
  return view
}

function text(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error(`${label} inválido`)
  return value.trim()
}

function policy(value: unknown): AgentPolicy {
  if (value !== "human" && value !== "agent-safe" && value !== "agent-full") throw new Error("Política inválida")
  return value
}

function browserCommand(value: unknown): BrowserCommand {
  if (value !== "back" && value !== "forward" && value !== "reload" && value !== "stop" && value !== "devtools") throw new Error("Comando de navegador inválido")
  return value
}

function spawnTerminalProcess(): TerminalProcess {
  const shell = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  const child = spawn(shell, ["-NoLogo", "-NoProfile", "-NoExit", "-Command", "[Console]::InputEncoding=[Console]::OutputEncoding=$OutputEncoding=[Text.UTF8Encoding]::new()"], {
    env: terminalEnvironment(process.env),
    shell: false,
    windowsHide: true,
    stdio: "pipe",
  })
  if (!child.pid || !child.stdin || !child.stdout || !child.stderr) throw new Error("PowerShell não pôde ser iniciado")
  return {
    pid: child.pid,
    write: (input) => child.stdin.write(input),
    kill: () => { if (!child.killed) child.kill() },
    onOutput: (listener) => { child.stdout.on("data", (chunk: Buffer) => listener(chunk.toString("utf8"))); child.stderr.on("data", (chunk: Buffer) => listener(chunk.toString("utf8"))) },
    onExit: (listener) => child.once("exit", listener),
  }
}

function registerIpc() {
  const handle = (channel: string, listener: (event: IpcMainInvokeEvent, input: unknown) => unknown) => {
    ipcMain.handle(channel, (event, input: unknown) => {
      assertTrustedShell(event, mainWindow, shellUrl)
      return listener(event, input)
    })
  }
  handle("naevia:snapshot", () => repository.snapshot())
  handle("naevia:capsule:create", async (_event, input: unknown) => {
    const value = input as Record<string, unknown>
    const name = text(value?.name, "Nome", 50)
    const selectedPolicy = policy(value?.policy)
    const capsule: CapsuleView = { id: randomUUID(), name, policy: selectedPolicy }
    const tab: TabView = { id: randomUUID(), capsuleId: capsule.id, title: "Nova aba", url: "https://duckduckgo.com/", active: true, loading: false }
    const changed = await repository.mutate((state) => {
      state.capsules.push(capsule)
      state.tabs = state.tabs.map((item) => ({ ...item, active: false }))
      state.tabs.push(tab)
      state.activeCapsuleId = capsule.id
      state.activeTabId = tab.id
    })
    await showActive(changed); publish(changed); return changed
  })
  handle("naevia:capsule:activate", async (_event, input: unknown) => {
    const capsuleId = text((input as Record<string, unknown>)?.capsuleId, "Cápsula", 36)
    const selected = activateCapsule(await repository.snapshot(), capsuleId)
    const changed = await repository.mutate((state) => Object.assign(state, selected))
    await showActive(changed); publish(changed); return changed
  })
  handle("naevia:tab:create", async (_event, input: unknown) => {
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
  handle("naevia:tab:activate", async (_event, input: unknown) => {
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
  handle("naevia:tab:close", async (_event, input: unknown) => {
    const tabId = text((input as Record<string, unknown>)?.tabId, "Aba", 36)
    const selected = closeTab(await repository.snapshot(), tabId)
    const view = views.get(tabId)
    if (view) { mainWindow?.contentView.removeChildView(view); view.webContents.close(); views.delete(tabId) }
    const changed = await repository.mutate((state) => Object.assign(state, selected))
    await showActive(changed); publish(changed); return changed
  })
  handle("naevia:browser:command", async (_event, input: unknown) => {
    const value = input as Record<string, unknown>
    const tabId = text(value?.tabId, "Aba", 36)
    const snapshot = await repository.snapshot()
    if (snapshot.activeTabId !== tabId) throw new Error("Somente a aba ativa pode ser controlada")
    const tab = snapshot.tabs.find((item) => item.id === tabId)!
    const capsule = snapshot.capsules.find((item) => item.id === tab.capsuleId)!
    const contents = ensureView(tab, capsule.policy).webContents
    const command = browserCommand(value?.command)
    if (command === "back" && contents.navigationHistory.canGoBack()) contents.navigationHistory.goBack()
    else if (command === "forward" && contents.navigationHistory.canGoForward()) contents.navigationHistory.goForward()
    else if (command === "reload") contents.reload()
    else if (command === "stop") contents.stop()
    else if (command === "devtools") {
      if (!policyAllows(capsule.policy, "devtools")) throw new Error("DevTools está disponível somente em cápsulas humanas")
      contents.openDevTools({ mode: "detach" })
    }
  })
  handle("naevia:browser:kill-switch", async (_event, input: unknown) => {
    const enabled = (input as Record<string, unknown>)?.enabled
    if (typeof enabled !== "boolean") throw new Error("Kill switch inválido")
    killSwitchEnabled = enabled
    for (const view of views.values()) {
      view.webContents.session.enableNetworkEmulation({ offline: enabled })
      if (enabled) view.webContents.stop()
    }
    return killSwitchEnabled
  })
  handle("naevia:tab:navigate", async (_event, input: unknown) => {
    const value = input as Record<string, unknown>
    const tabId = text(value?.tabId, "Aba", 36)
    const url = navigationTarget(text(value?.input, "Endereço", 2_048))
    const snapshot = await repository.snapshot()
    if (snapshot.activeTabId !== tabId) throw new Error("Somente a aba ativa pode navegar")
    const tab = snapshot.tabs.find((item) => item.id === tabId)!
    const capsule = snapshot.capsules.find((item) => item.id === tab.capsuleId)!
    await ensureView(tab, capsule.policy).webContents.loadURL(url)
    return repository.snapshot()
  })
  handle("naevia:layout", async (_event, input: unknown) => {
    const value = input as Record<string, unknown>
    if (!['none', 'store', 'workbench', 'library', 'migration'].includes(String(value?.side)) || typeof value?.terminal !== "boolean") throw new Error("Layout inválido")
    const window = mainWindow
    const previous = panelState
    if (window && workbenchView) window.contentView.removeChildView(workbenchView)
    panelState = { side: value.side as typeof panelState.side, terminal: value.terminal }
    layout()
    if (panelState.side === "workbench" && window && !window.isDestroyed()) {
      try {
        const view = await ensureWorkbenchView()
        if (panelState.side === "workbench" && !window.isDestroyed()) { window.contentView.addChildView(view); layout() }
      } catch {
        panelState = previous
        layout()
        throw new Error("Workbench não está disponível em 127.0.0.1:3005")
      }
    }
  })
  handle("naevia:store:catalog", async () => {
    const response = await fetch("http://127.0.0.1:3000/api/v1/distribution/catalog", { signal: AbortSignal.timeout(2_500), cache: "no-store" })
    if (!response.ok) throw new Error(`Matriz Hub indisponível (${response.status})`)
    return storeProducts(await response.json())
  })
  handle("naevia:store:open-control", async () => openControlStore(process.env.LOCALAPPDATA, (path) => shell.openPath(path)))
  handle("naevia:downloads:list", () => [...downloads.values()].map(({ view }) => view))
  handle("naevia:downloads:show", (_event, input: unknown) => {
    const id = text((input as Record<string, unknown>)?.downloadId, "Download", 36)
    const download = downloads.get(id)
    if (!download || download.view.status !== "completed") throw new Error("Download indisponível")
    shell.showItemInFolder(download.path)
  })
  handle("naevia:legacy:preview", () => legacyImport.preview())
  handle("naevia:legacy:status", () => legacyImport.status())
  handle("naevia:legacy:confirm", async (_event, input: unknown) => {
    const token = text((input as Record<string, unknown>)?.confirmationToken, "Confirmação", 36)
    const result = await legacyImport.confirm(token)
    await reloadBrowserViews()
    return result
  })
  handle("naevia:legacy:rollback", async () => {
    const result = await legacyImport.rollback()
    await reloadBrowserViews()
    return result
  })
  handle("naevia:terminal:list", () => terminalHost.list())
  handle("naevia:terminal:create", () => { terminalHost.create(); return terminalHost.list() })
  handle("naevia:terminal:write", (_event, input: unknown) => {
    const value = input as Record<string, unknown>
    const sessionId = text(value?.sessionId, "Sessão", 36)
    if (typeof value?.input !== "string") throw new Error("Entrada inválida")
    terminalHost.write(sessionId, value.input)
  })
  handle("naevia:terminal:interrupt", (_event, input: unknown) => terminalHost.interrupt(text((input as Record<string, unknown>)?.sessionId, "Sessão", 36)))
  handle("naevia:terminal:close", (_event, input: unknown) => { terminalHost.close(text((input as Record<string, unknown>)?.sessionId, "Sessão", 36)); return terminalHost.list() })
  terminalHost.subscribe((sessions) => {
    const window = mainWindow
    if (window && !window.isDestroyed()) window.webContents.send("naevia:terminal:sessions", sessions)
  })
}

async function reloadBrowserViews() {
  const window = mainWindow
  for (const view of views.values()) { window?.contentView.removeChildView(view); view.webContents.close() }
  views.clear(); activeViewId = ""
  const snapshot = await repository.snapshot()
  await showActive(snapshot); publish(snapshot)
}

async function createWindow() {
  downloadDirectory = process.env.NAEVIA_DOWNLOAD_DIR || join(app.getPath("downloads"), "NAEVIA")
  await mkdir(downloadDirectory, { recursive: true })
  repository = new BrowserRepository(join(app.getPath("userData"), "browser-state.json"))
  const appData = app.getPath("appData")
  const testLegacyRoot = process.env.NAEVIA_E2E === "1" ? process.env.NAEVIA_LEGACY_ROOT : undefined
  legacyImport = new LegacyImportService(
    app.getPath("userData"),
    [...(testLegacyRoot ? [testLegacyRoot] : []), join(appData, "Matriz Control Electron"), join(appData, "Matriz Control")],
    (snapshot, expected) => repository.replace(snapshot, expected),
    () => repository.snapshot(),
  )
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 640, backgroundColor: "#08070c", title: "NAEVIA",
    webPreferences: { preload: join(here, "preload.cjs"), sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true },
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault())
  mainWindow.webContents.on("will-navigate", (event, url) => { if (!isShellUrl(url, shellUrl)) event.preventDefault() })
  mainWindow.webContents.on("will-redirect", (event, url) => { if (!isShellUrl(url, shellUrl)) event.preventDefault() })
  mainWindow.on("resize", layout)
  mainWindow.on("closed", () => { for (const view of views.values()) view.webContents.close(); views.clear(); workbenchView?.webContents.close(); workbenchView = undefined; mainWindow = undefined })
  const devUrl = app.isPackaged ? undefined : process.env.NAEVIA_DEV_URL
  if (devUrl && devUrl !== "http://127.0.0.1:1430/") throw new Error("Origem de desenvolvimento não autorizada")
  shellUrl = devUrl ?? pathToFileURL(join(here, "../../dist/index.html")).href
  await mainWindow.loadURL(shellUrl)
  const snapshot = await repository.snapshot()
  await showActive(snapshot)
}

app.whenReady().then(async () => { registerIpc(); await createWindow() })
app.on("before-quit", () => terminalHost.closeAll())
app.on("window-all-closed", () => app.quit())
