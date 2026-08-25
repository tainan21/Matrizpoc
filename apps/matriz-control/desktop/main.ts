import { app, BrowserWindow, ipcMain, session, WebContentsView, type DownloadItem, type IpcMainInvokeEvent, type WebContents } from "electron"
import { randomBytes, randomUUID } from "node:crypto"
import { spawn, type ChildProcess } from "node:child_process"
import { appendFile, chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { createServer, type Server } from "node:net"
import { basename, join } from "node:path"
import { BrowserRuntime, MemoryBrowserRepository, type BrowserCommand, type BrowserRepository } from "../src/application/browser-runtime"
import { automationCapabilityForTarget, canAgentBootstrapCapsule, navigationTarget, tabsToSuspend, type AgentCapability, type BrowserTab, type Capsule } from "../src/domain/browser"
import { parseDesktopCommand, type BrowserEvent, type DesktopCommand, type DesktopResult } from "../src/application/desktop-bridge"
import { SqliteBrowserRepository } from "../src/integration/browser/sqlite-browser-repository"
import { WorkspaceFileRepository } from "../src/integration/browser/workspace-file-repository"
import { listTerminalProjects } from "../src/integration/projects/project-catalog"
import { BitLockerVhdxVault, type VaultBackend } from "../src/integration/browser/bitlocker-vault"
import { ElectronSafeStorageKeyStore, PowerShellVaultHelper } from "./electron-vault-adapters"
import { CONTROL_SESSION_COOKIE, createSessionValue } from "../src/auth/local-access"

app.enableSandbox()

let window: BrowserWindow
let viewport = { x: 0, y: 0, width: 0, height: 0, visible: false }
const views = new Map<string, WebContentsView>()
type PageRef = { x: number; y: number; width: number; height: number; inputType: string; autocomplete: string; intent: string }
const pageRefs = new Map<string, Map<string, PageRef>>()
let activeTabId: string | null = null
let repository: BrowserRepository
let sqlite: SqliteBrowserRepository | undefined
let runtime: BrowserRuntime
let commandServer: Server | undefined
let agentKilled = false
let rendererServer: ChildProcess | undefined
let vaultRoot: string | undefined
let vault: VaultBackend | undefined
let windowCloseAuthorized = false
const rootDir = process.env.MATRIZ_WORKSPACE_ROOT ?? (app.isPackaged ? process.cwd() : join(__dirname, "../../../.."))
const localToken = process.env.MATRIZ_CONTROL_LOCAL_TOKEN ?? randomBytes(32).toString("hex")
process.env.MATRIZ_CONTROL_LOCAL_TOKEN = localToken

function send(event: BrowserEvent) { if (!window.isDestroyed()) window.webContents.send("matriz:browser:event", event) }

async function createWindow() {
  await ensureRendererServer()
  if (!vaultRoot) {
    const userData = app.getPath("userData")
    const helperPath = app.isPackaged ? join(process.resourcesPath, "vault-helper.ps1") : join(__dirname, "../../desktop/vault-helper.ps1")
    vault = new BitLockerVhdxVault({ platform: process.platform, dataRoot: userData, helper: new PowerShellVaultHelper(helperPath), keys: new ElectronSafeStorageKeyStore(join(userData, "vault", "recovery-key.bin")) })
    const status = await vault.status()
    if (status.mounted && status.mountPath) vaultRoot = status.mountPath
  }
  const dataRoot = vaultRoot ?? join(app.getPath("userData"), "ephemeral-browser")
  if (vaultRoot) { sqlite = new SqliteBrowserRepository(join(vaultRoot, "browser.sqlite")); repository = sqlite }
  else repository = new MemoryBrowserRepository()
  runtime = new BrowserRuntime({ repository })
  window = new BrowserWindow({ width: 1440, height: 900, minWidth: 980, minHeight: 700, backgroundColor: "#08060e", webPreferences: { preload: join(__dirname, "preload.js"), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } })
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  await window.webContents.session.cookies.set({ url: "http://127.0.0.1:3009", name: CONTROL_SESSION_COOKIE, value: createSessionValue(localToken), path: "/", httpOnly: true, sameSite: "strict", secure: false, expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 12 })
  await window.loadURL(process.env.MATRIZ_CONTROL_DESKTOP_URL ?? "http://127.0.0.1:3009/browser")
  window.on("close", (event) => {
    if (windowCloseAuthorized || !vault || !vaultRoot) return
    event.preventDefault()
    const root = vaultRoot
    void closeBrowserStorage()
      .then(() => vault?.lock())
      .then((status) => { if (status?.mounted) throw new Error("The vault is still mounted"); vaultRoot = undefined; windowCloseAuthorized = true; window.close() })
      .catch(async () => { await activateVault(root); send({ type: "runtime.failed", message: "Não foi possível bloquear o cofre; a janela permaneceu aberta." }) })
  })
  window.on("closed", () => { for (const view of views.values()) view.webContents.close(); views.clear(); sqlite?.close(); sqlite = undefined })
  await mkdir(dataRoot, { recursive: true })
  await startCommandServer()
}

async function ensureRendererServer() {
  if (!app.isPackaged || process.env.MATRIZ_CONTROL_DESKTOP_URL) return
  const server = join(process.resourcesPath, "next", "apps", "matriz-control", "server.js")
  rendererServer = spawn(process.execPath, [server], {
    cwd: join(process.resourcesPath, "next", "apps", "matriz-control"),
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", HOSTNAME: "127.0.0.1", PORT: "3009" },
    stdio: "ignore",
    windowsHide: true,
  })
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { const response = await fetch("http://127.0.0.1:3009/browser"); if (response.ok) return } catch { /* renderer is still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error("The local Matriz Control renderer did not start")
}

function assertTrusted(event: IpcMainInvokeEvent) {
  if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error("Untrusted desktop bridge sender")
  const origin = new URL(event.senderFrame.url).origin
  if (origin !== "http://127.0.0.1:3009" && origin !== "http://localhost:3009") throw new Error("Untrusted desktop bridge origin")
}

async function ensureView(tab: BrowserTab) {
  const existing = views.get(tab.id)
  if (existing) return existing
  const capsule = await repository.getCapsule(tab.capsuleId)
  if (!capsule) throw new Error("Unknown capsule")
  const dataRoot = vaultRoot ? join(vaultRoot, "profiles", capsule.id) : undefined
  const isolatedSession = dataRoot ? session.fromPath(dataRoot, { cache: capsule.cacheMode === "persistent" }) : session.fromPartition(`capsule:${capsule.id}`, { cache: false })
  const downloadRoot = vaultRoot ? join(vaultRoot, "downloads", capsule.id) : undefined
  if (downloadRoot) await mkdir(downloadRoot, { recursive: true })
  isolatedSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  const view = new WebContentsView({ webPreferences: { session: isolatedSession, nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, devTools: true } })
  view.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  view.webContents.on("will-navigate", (event, url) => { if (!/^https?:/i.test(url)) event.preventDefault() })
  view.webContents.on("did-start-loading", () => { pageRefs.delete(tab.id); void emitTab(tab.id, { status: "loading" }) })
  view.webContents.on("did-stop-loading", () => emitTab(tab.id, { status: "ready", url: view.webContents.getURL(), title: view.webContents.getTitle() }))
  view.webContents.on("page-title-updated", (_event, title) => emitTab(tab.id, { title }))
  const handleDownload = (_event: unknown, item: DownloadItem, contents: WebContents) => {
    if (contents !== view.webContents) return
    if (!downloadRoot) { item.cancel(); send({ type: "runtime.failed", message: "Abra o cofre antes de baixar arquivos." }); return }
    const download = { id: `download_${randomUUID()}`, capsuleId: capsule.id, url: item.getURL(), filename: `${Date.now()}-${safeName(item.getFilename())}`, state: "progressing" as const, createdAt: new Date().toISOString() }
    item.setSavePath(join(downloadRoot, download.filename))
    void repository.saveDownload(download).then(() => send({ type: "download.updated", id: download.id, filename: download.filename, state: "progressing" })).catch(() => item.cancel())
    item.once("done", (_doneEvent, state) => { const nextState = state === "completed" ? "completed" : state === "cancelled" ? "cancelled" : "failed"; void repository.saveDownload({ ...download, state: nextState }); send({ type: "download.updated", id: download.id, filename: download.filename, state: nextState }) })
  }
  isolatedSession.on("will-download", handleDownload)
  view.webContents.once("destroyed", () => isolatedSession.off("will-download", handleDownload))
  window.contentView.addChildView(view)
  views.set(tab.id, view)
  await view.webContents.loadURL(tab.url)
  return view
}

async function emitTab(tabId: string, changes: Partial<BrowserTab>) {
  for (const capsule of await repository.listCapsules()) {
    const tab = (await repository.listTabs(capsule.id)).find((item) => item.id === tabId)
    if (tab) { const updated = { ...tab, ...changes }; await repository.saveTab(updated); send({ type: "tab.updated", tab: updated }); return }
  }
}

function layoutActiveView() {
  for (const [id, view] of views) view.setVisible(viewport.visible && id === activeTabId)
  const view = activeTabId ? views.get(activeTabId) : undefined
  if (view && viewport.visible) view.setBounds({ x: viewport.x, y: viewport.y, width: Math.max(1, viewport.width), height: Math.max(1, viewport.height) })
}

async function dispatch(command: DesktopCommand): Promise<DesktopResult> {
  if (["capsule.create", "capsule.list", "capsule.delegate", "tab.open", "tab.list"].includes(command.type)) {
    const result = await runtime.execute(command as BrowserCommand)
    if (command.type === "tab.open") { const tab = result as BrowserTab; activeTabId = tab.id; await ensureView(tab); await enforceLiveTabLimit(); layoutActiveView() }
    return result
  }
  if (command.type === "browser.status") return { available: true, version: app.getVersion() }
  if (command.type === "tab.activate") { activeTabId = command.tabId; let selected: BrowserTab | undefined; for (const capsule of await repository.listCapsules()) for (const tab of await repository.listTabs(capsule.id)) if (tab.id === command.tabId || tab.active) { const updated = { ...tab, active: tab.id === command.tabId, status: tab.id === command.tabId && tab.status === "suspended" ? "loading" as const : tab.status, lastActiveAt: tab.id === command.tabId ? new Date().toISOString() : tab.lastActiveAt }; await repository.saveTab(updated); if (updated.active) selected = updated } if (!selected) throw new Error("Unknown tab"); await ensureView(selected); layoutActiveView(); return { ok: true } }
  if (command.type === "tab.close") { const view = views.get(command.tabId); if (view) { window.contentView.removeChildView(view); view.webContents.close(); views.delete(command.tabId) } pageRefs.delete(command.tabId); await repository.deleteTab(command.tabId); send({ type: "tab.closed", tabId: command.tabId }); return { ok: true } }
  if (command.type === "tab.back" || command.type === "tab.forward" || command.type === "tab.reload") { const view = views.get(command.tabId); if (!view) throw new Error("Unknown tab"); if (command.type === "tab.back" && view.webContents.navigationHistory.canGoBack()) view.webContents.navigationHistory.goBack(); if (command.type === "tab.forward" && view.webContents.navigationHistory.canGoForward()) view.webContents.navigationHistory.goForward(); if (command.type === "tab.reload") view.webContents.reload(); return { ok: true } }
  if (command.type === "tab.navigate") { const tab = await findTab(command.tabId); const capsule = await repository.getCapsule(tab.capsuleId); if (!capsule) throw new Error("Unknown capsule"); const url = navigationTarget(command.input, capsule.searchProvider); const updated = { ...tab, url, status: "loading" as const }; await repository.saveTab(updated); activeTabId = tab.id; await (await ensureView(updated)).webContents.loadURL(url); layoutActiveView(); return updated }
  if (command.type === "page.screenshot" || command.type === "page.pdf" || command.type === "page.reader" || command.type === "page.find" || command.type === "page.snapshot" || command.type === "page.click" || command.type === "page.type" || command.type === "page.download") {
    const view = views.get(command.tabId)
    if (!view) throw new Error("Unknown tab")
    if (command.type === "page.screenshot" || command.type === "page.pdf") {
      if (!vaultRoot) throw new Error("Abra o cofre antes de salvar capturas ou PDFs")
      const output = join(vaultRoot, "artifacts")
      await mkdir(output, { recursive: true })
      if (command.type === "page.screenshot") { const path = join(output, `${Date.now()}-${safeName(view.webContents.getTitle())}.png`); await writeFile(path, (await view.webContents.capturePage()).toPNG()); return path }
      const path = join(output, `${Date.now()}-${safeName(view.webContents.getTitle())}.pdf`); await writeFile(path, await view.webContents.printToPDF({ printBackground: true })); return path
    }
    if (command.type === "page.find") { view.webContents.findInPage(command.text); return { ok: true } }
    if (command.type === "page.reader") return view.webContents.executeJavaScript("document.body?.innerText?.slice(0, 200000) ?? ''", true) as Promise<string>
    if (command.type === "page.snapshot") {
      const snapshot = JSON.parse(await view.webContents.executeJavaScript(snapshotScript, true) as string) as { elements: Array<{ ref: string; bounds: PageRef }> }
      pageRefs.set(command.tabId, new Map(snapshot.elements.map((item) => [item.ref, item.bounds])))
      return JSON.stringify(snapshot)
    }
    if (command.type === "page.click" || command.type === "page.type") {
      const bounds = pageRefs.get(command.tabId)?.get(command.ref)
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) throw new Error("Unknown or stale page reference; request a new snapshot")
      const point = { x: Math.round(bounds.x + bounds.width / 2), y: Math.round(bounds.y + bounds.height / 2) }
      view.webContents.sendInputEvent({ type: "mouseDown", ...point, button: "left", clickCount: 1 })
      view.webContents.sendInputEvent({ type: "mouseUp", ...point, button: "left", clickCount: 1 })
      if (command.type === "page.type") {
        view.webContents.sendInputEvent({ type: "keyDown", keyCode: "A", modifiers: ["control"] })
        view.webContents.sendInputEvent({ type: "keyUp", keyCode: "A", modifiers: ["control"] })
        view.webContents.insertText(command.text)
      }
      return { ok: true }
    }
    if (command.type !== "page.download") throw new Error("Unsupported page command")
    const url = navigationTarget(command.url, { kind: "duckduckgo" })
    view.webContents.downloadURL(url)
    return { ok: true }
  }
  const fileRepository = new WorkspaceFileRepository({ resolveProject: async (id) => (await listTerminalProjects(rootDir)).find((item) => item.id === id)?.path })
  if (command.type === "project.list") return (await listTerminalProjects(rootDir)).map(({ id, name }) => ({ id, name }))
  if (command.type === "library.search") return repository.searchLibrary ? repository.searchLibrary(command.capsuleId, command.query) : []
  if (command.type === "file.read") return fileRepository.read(command.projectId, command.path)
  if (command.type === "file.write") return fileRepository.write(command.projectId, command.path, command.content, command.expectedVersion)
  if (command.type === "vault.status") return vault ? vault.status() : { supported: process.platform === "win32", provisioned: Boolean(vaultRoot), mounted: Boolean(vaultRoot), mountPath: vaultRoot ?? null, reason: null }
  if (command.type === "vault.provision") { if (!vault) throw new Error("The configured vault is managed externally"); const status = await vault.provision(); if (status.mountPath) await activateVault(status.mountPath); return status }
  if (command.type === "vault.unlock") { if (!vault) throw new Error("The configured vault is managed externally"); const status = await vault.unlock(); if (status.mountPath) await activateVault(status.mountPath); return status }
  if (command.type === "vault.lock") {
    if (!vault) throw new Error("The configured vault is managed externally")
    const root = vaultRoot
    await closeBrowserStorage()
    try {
      const status = await vault.lock()
      if (status.mounted) throw new Error("The vault is still mounted")
      vaultRoot = undefined
      repository = new MemoryBrowserRepository()
      runtime = new BrowserRuntime({ repository })
      return status
    } catch (error) {
      if (root) await activateVault(root)
      throw error
    }
  }
  if (command.type === "agent.policy") {
    const capsule = await repository.getCapsule(command.capsuleId)
    if (!capsule) throw new Error("Unknown capsule")
    if (command.policy === "human") { if (capsule.kind !== "human") throw new Error("Agent capsules require an agent policy"); const updated = { ...capsule, policy: "human" as const }; await repository.saveCapsule(updated); return updated }
    return runtime.execute({ type: "capsule.delegate", capsuleId: command.capsuleId, policy: command.policy })
  }
  if (command.type === "agent.kill") { agentKilled = true; return { ok: true } }
  throw new Error("Unsupported desktop command")
}

async function findTab(id: string) { for (const capsule of await repository.listCapsules()) { const tab = (await repository.listTabs(capsule.id)).find((item) => item.id === id); if (tab) return tab } throw new Error("Unknown tab") }
function safeName(value: string) { return basename(value.replace(/[^a-z0-9._-]+/gi, "-").slice(0, 80) || "page") }

async function enforceLiveTabLimit() {
  const tabs: BrowserTab[] = []
  for (const capsule of await repository.listCapsules()) tabs.push(...await repository.listTabs(capsule.id))
  for (const tabId of tabsToSuspend(tabs, 8)) {
    const tab = tabs.find((item) => item.id === tabId)
    if (!tab) continue
    const view = views.get(tabId)
    if (view) { window.contentView.removeChildView(view); view.webContents.close(); views.delete(tabId) }
    pageRefs.delete(tabId)
    const suspended = { ...tab, status: "suspended" as const }
    await repository.saveTab(suspended)
    send({ type: "tab.updated", tab: suspended })
  }
}

async function activateVault(root: string) {
  await closeBrowserStorage()
  vaultRoot = root
  sqlite = new SqliteBrowserRepository(join(root, "browser.sqlite"))
  repository = sqlite
  runtime = new BrowserRuntime({ repository })
}

async function closeBrowserStorage() {
  activeTabId = null
  for (const view of views.values()) { window.contentView.removeChildView(view); view.webContents.close() }
  views.clear()
  pageRefs.clear()
  sqlite?.close()
  sqlite = undefined
}

const snapshotScript = `(() => JSON.stringify({ url: location.href, title: document.title, text: (document.body?.innerText ?? '').slice(0, 120000), elements: [...document.querySelectorAll('a,button,input,textarea,select,[role="button"]')].slice(0, 500).map((node, index) => { const rect = node.getBoundingClientRect(); const intent = (node.getAttribute('aria-label') || node.textContent || node.getAttribute('placeholder') || node.getAttribute('title') || '').trim().slice(0, 300); return { ref: 'm' + index, role: node.getAttribute('role') || node.tagName.toLowerCase(), name: intent, bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, inputType: node.getAttribute('type') || '', autocomplete: node.getAttribute('autocomplete') || '', intent } }; }) }))()`

async function startCommandServer() {
  const token = randomBytes(32).toString("hex")
  const endpoint = `\\\\.\\pipe\\matriz-control-${process.pid}-${randomBytes(8).toString("hex")}`
  commandServer = createServer((socket) => {
    let pending = ""
    socket.setEncoding("utf8")
    socket.on("data", (chunk) => {
      pending += chunk
      if (pending.length > 2_500_000) { socket.destroy(); return }
      let newline = pending.indexOf("\n")
      while (newline >= 0) {
        const line = pending.slice(0, newline); pending = pending.slice(newline + 1)
        void handleAgentLine(line, token).then((response) => socket.write(`${JSON.stringify(response)}\n`))
        newline = pending.indexOf("\n")
      }
    })
  })
  await new Promise<void>((resolve, reject) => commandServer?.once("error", reject).listen(endpoint, resolve))
  const runtimeFile = join(app.getPath("userData"), "mcp-runtime.json")
  await mkdir(app.getPath("userData"), { recursive: true })
  await writeFile(runtimeFile, JSON.stringify({ endpoint, token }), { encoding: "utf8", mode: 0o600 })
  await chmod(runtimeFile, 0o600).catch(() => undefined)
  await restrictRuntimeFile(runtimeFile)
}

async function restrictRuntimeFile(path: string) {
  if (process.platform !== "win32") return
  const domain = process.env.USERDOMAIN
  const username = process.env.USERNAME
  if (!domain || !username || !/^[\w .-]+$/.test(domain) || !/^[\w .-]+$/.test(username)) throw new Error("The current Windows account could not be identified for MCP ACL setup")
  await new Promise<void>((resolve, reject) => {
    const child = spawn("icacls.exe", [path, "/inheritance:r", "/grant:r", `${domain}\\${username}:(F)`], { windowsHide: true, stdio: "ignore" })
    child.once("error", () => reject(new Error("MCP runtime ACL setup failed")))
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error("MCP runtime ACL setup failed")))
  })
}

async function handleAgentLine(line: string, token: string): Promise<{ id: string | null; result?: unknown; error?: string }> {
  let id: string | null = null
  let capsuleId: string | null = null
  let type = "invalid"
  try {
    const request = JSON.parse(line) as { id?: unknown; token?: unknown; command?: unknown }
    id = typeof request.id === "string" ? request.id : null
    if (request.token !== token) throw new Error("Authentication failed")
    const command = parseDesktopCommand(request.command)
    type = command.type
    if (agentKilled && command.type !== "agent.kill") throw new Error("Agent kill switch is active")
    capsuleId = await authorizeAgentCommand(command)
    const result = await dispatch(command)
    const safeResult = command.type === "page.screenshot" && typeof result === "string"
      ? { filename: basename(result), mimeType: "image/png", data: (await readFile(result)).toString("base64") }
      : command.type === "page.pdf" && typeof result === "string" ? { filename: basename(result), saved: true } : result
    await auditAgent(type, capsuleId, "mcp", "ok")
    return { id, result: safeResult }
  } catch (error) {
    await auditAgent(type, capsuleId, "mcp", "denied")
    return { id, error: error instanceof Error ? error.message : "Command failed" }
  }
}

async function authorizeAgentCommand(command: DesktopCommand): Promise<string | null> {
  if (command.type === "agent.kill" || command.type === "capsule.list" || command.type === "project.list" || command.type === "browser.status") return null
  if (command.type === "capsule.create") { if (!canAgentBootstrapCapsule(command.kind, command.policy)) throw new Error("MCP can create agent-safe capsules only"); return null }
  if (command.type === "capsule.delegate" || command.type === "agent.policy" || command.type.startsWith("vault.")) throw new Error("Policy and vault changes require the human interface")
  const direct = "capsuleId" in command ? command.capsuleId : null
  const capsuleId = direct ?? ("tabId" in command ? (await findTab(command.tabId)).capsuleId : null)
  if (!capsuleId) return null
  let capability: AgentCapability = command.type === "file.write" ? "files.write" : command.type === "file.read" ? "files.read" : command.type === "page.type" ? "page.type" : command.type === "page.click" || command.type === "page.download" ? "page.click" : "page.read"
  if (command.type === "page.click" || command.type === "page.type") {
    const target = pageRefs.get(command.tabId)?.get(command.ref)
    if (!target) throw new Error("Unknown or stale page reference; request a new snapshot")
    capability = automationCapabilityForTarget(command.type, target)
  }
  await runtime.authorizeAgent(capsuleId, capability)
  return capsuleId
}

async function auditAgent(action: string, capsuleId: string | null, origin: string, result: string) {
  const entry = JSON.stringify({ action, capsuleId, origin, at: new Date().toISOString(), result })
  await appendFile(join(app.getPath("userData"), "agent-audit.jsonl"), `${entry}\n`, { encoding: "utf8", mode: 0o600 }).catch(() => undefined)
}

ipcMain.handle("matriz:browser:invoke", async (event, value: unknown) => { assertTrusted(event); return dispatch(parseDesktopCommand(value)) })
ipcMain.on("matriz:browser:viewport", (event, value: typeof viewport) => { if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) return; const origin = new URL(event.senderFrame.url).origin; if (origin !== "http://127.0.0.1:3009" && origin !== "http://localhost:3009") return; if (!value || ![value.x, value.y, value.width, value.height].every(Number.isFinite)) return; viewport = { ...value, visible: Boolean(value.visible) }; layoutActiveView() })

app.whenReady().then(createWindow).catch((error) => { console.error(error instanceof Error ? error.message : "Desktop startup failed"); app.quit() })
let quitLockComplete = false
app.on("before-quit", (event) => {
  if (quitLockComplete || !vault || !vaultRoot) return
  event.preventDefault()
  const root = vaultRoot
  void closeBrowserStorage()
    .then(() => vault?.lock())
    .then((status) => { if (status?.mounted) throw new Error("The vault is still mounted"); vaultRoot = undefined; quitLockComplete = true; app.quit() })
    .catch(async () => { if (root && !window.isDestroyed()) { await activateVault(root); send({ type: "runtime.failed", message: "Não foi possível bloquear o cofre; o Matriz Control permaneceu aberto." }) } })
})
app.on("window-all-closed", () => { commandServer?.close(); rendererServer?.kill(); app.quit() })
