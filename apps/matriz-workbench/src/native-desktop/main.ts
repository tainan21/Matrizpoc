import { createHash, randomBytes, randomUUID } from "node:crypto"
import { spawn, type ChildProcess } from "node:child_process"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  assertWorkbenchDesktopPortAvailable,
  createWorkbenchDesktopServerEnvironment,
  workbenchDesktopServer,
} from "./server"
import { createWorkbenchDesktopWebPreferences, isAllowedWorkbenchDesktopUrl } from "./shell-policy"
import { resolveNativeWorkspaceBinding } from "./workspace-binding"
import { createNativeWorkspaceBindingStore } from "./workspace-binding-store"
import { createPairingSecretStore } from "./pairing-secret-store"
import { configureManualUpdater, type ManualUpdater } from "./updater-policy"

interface NativeWindow {
  loadURL(url: string): Promise<void>
  show(): void
  focus(): void
  isDestroyed(): boolean
  webContents: {
    setWindowOpenHandler(handler: () => { action: "deny" }): void
    on(event: "will-navigate", handler: (event: { preventDefault(): void }, url: string) => void): void
  }
}

interface ElectronRuntime {
  app: {
    requestSingleInstanceLock(): boolean
    quit(): void
    whenReady(): Promise<void>
    getPath(name: "userData"): string
    isPackaged: boolean
    on(event: string, handler: (...args: never[]) => void): void
  }
  BrowserWindow: new (options: { show: boolean; width: number; height: number; webPreferences: ReturnType<typeof createWorkbenchDesktopWebPreferences> }) => NativeWindow
  dialog: {
    showOpenDialog(options: { title: string; properties: string[] }): Promise<{ canceled: boolean; filePaths: string[] }>
    showMessageBox(options: { type: "error"; title: string; message: string }): Promise<unknown>
  }
  session: {
    defaultSession: {
      setPermissionRequestHandler(handler: (_webContents: unknown, _permission: string, callback: (allowed: boolean) => void) => void): void
      setPermissionCheckHandler(handler: () => boolean): void
      cookies: { set(details: { url: string; name: string; value: string; httpOnly: boolean; sameSite: "strict"; secure: boolean; path: string }): Promise<void> }
    }
  }
  safeStorage: { isEncryptionAvailable(): boolean; encryptString(value: string): Buffer; decryptString(value: Buffer): string }
  Menu: { buildFromTemplate(template: unknown[]): unknown; setApplicationMenu(menu: unknown): void }
}

const electron = require("electron") as ElectronRuntime
let mainWindow: NativeWindow | undefined
let managedServer: ChildProcess | undefined

function focusMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus()
}

function installedAppRoot(): string {
  return path.resolve(__dirname, "..", "..")
}

async function waitForServer(url: string, process: ChildProcess): Promise<void> {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error("O servidor Next empacotado encerrou antes de iniciar.")
    try {
      await fetch(url, { signal: AbortSignal.timeout(500) })
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  throw new Error("O servidor Next empacotado não respondeu em 127.0.0.1:3005.")
}

async function startWorkbenchServer(workspaceRoot: string, token: string): Promise<string> {
  await assertWorkbenchDesktopPortAvailable()
  const server = workbenchDesktopServer(installedAppRoot())
  const child = spawn(process.execPath, [server.serverPath], {
    cwd: path.dirname(server.serverPath),
    env: {
      ...createWorkbenchDesktopServerEnvironment({
        workspaceRoot,
        sessionToken: token,
        inherited: process.env,
      }),
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: process.env.NODE_ENV ?? "production",
    },
    stdio: "ignore",
    windowsHide: true,
  })
  managedServer = child
  const url = `http://${server.host}:${server.port}/`
  await waitForServer(url, child)
  return url
}

async function nativePairingSecret(): Promise<string> {
  const target = path.join(electron.app.getPath("userData"), "pairing-secret.dpapi")
  return createPairingSecretStore({
    encryptionAvailable: () => electron.safeStorage.isEncryptionAvailable(),
    encrypt: (value) => electron.safeStorage.encryptString(value),
    decrypt: (value) => electron.safeStorage.decryptString(value),
    read: async () => readFile(target).catch(() => undefined),
    write: async (value) => {
      await mkdir(path.dirname(target), { recursive: true })
      const temporary = `${target}.${randomUUID()}.tmp`
      await writeFile(temporary, value, { mode: 0o600 })
      await rename(temporary, target)
    },
  }).getOrCreate(() => randomBytes(32).toString("base64url"))
}

async function provisionNativeSession(token: string): Promise<void> {
  const url = "http://127.0.0.1:3005"
  const digest = createHash("sha256").update(`matriz-workbench:v1:${token}`).digest("hex")
  const identity = Buffer.from(JSON.stringify({ id: "native-desktop-local", label: "Desktop local", source: "native", roles: ["local-operator"] })).toString("base64url")
  await electron.session.defaultSession.cookies.set({ url, name: "matriz_workbench_session", value: digest, httpOnly: true, sameSite: "strict", secure: false, path: "/" })
  await electron.session.defaultSession.cookies.set({ url, name: "matriz_workbench_identity", value: identity, httpOnly: true, sameSite: "strict", secure: false, path: "/" })
}

function installTrustedUpdaterMenu(): void {
  if (!electron.app.isPackaged) return
  const { autoUpdater } = require("electron-updater") as { autoUpdater: ManualUpdater }
  const actions = configureManualUpdater(autoUpdater)
  const report = (operation: () => Promise<unknown> | void) => () => Promise.resolve(operation()).catch((error: unknown) =>
    electron.dialog.showMessageBox({ type: "error", title: "Atualização do Workbench", message: error instanceof Error ? error.message : "Falha na atualização." }))
  const menu = electron.Menu.buildFromTemplate([{ label: "Atualizações", submenu: [
    { label: "Verificar atualizações", click: report(actions.check) },
    { label: "Baixar atualização verificada", click: report(actions.download) },
    { label: "Instalar atualização baixada", click: report(actions.install) },
  ] }])
  electron.Menu.setApplicationMenu(menu)
}

function stopManagedServer(): void {
  if (managedServer && managedServer.exitCode === null) managedServer.kill()
  managedServer = undefined
}

function createWorkbenchWindow(): NativeWindow {
  const window = new electron.BrowserWindow({
    show: false,
    width: 1440,
    height: 960,
    webPreferences: createWorkbenchDesktopWebPreferences(),
  })
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  window.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedWorkbenchDesktopUrl(url)) event.preventDefault()
  })
  return window
}

async function start(): Promise<void> {
  electron.session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  electron.session.defaultSession.setPermissionCheckHandler(() => false)
  installTrustedUpdaterMenu()
  const binding = await resolveNativeWorkspaceBinding({
    controlRoot: process.env.MATRIZ_REPO_ROOT,
    bindingStore: createNativeWorkspaceBindingStore(
      path.join(electron.app.getPath("userData"), "workspace-binding.json"),
    ),
    pickFolder: async () => {
      const selected = await electron.dialog.showOpenDialog({
        title: "Selecione a raiz do workspace Matriz",
        properties: ["openDirectory"],
      })
      return selected.canceled ? undefined : selected.filePaths[0]
    },
  })
  const token = await nativePairingSecret()
  const url = await startWorkbenchServer(binding.root, token)
  await provisionNativeSession(token)
  mainWindow = createWorkbenchWindow()
  await mainWindow.loadURL(url)
  mainWindow.show()
}

if (!electron.app.requestSingleInstanceLock()) {
  electron.app.quit()
} else {
  electron.app.on("second-instance", focusMainWindow)
  electron.app.on("window-all-closed", () => electron.app.quit())
  electron.app.on("before-quit", stopManagedServer)
  void electron.app.whenReady().then(start).catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : "Não foi possível iniciar o Matriz Workbench Desktop."
    await electron.dialog.showMessageBox({ type: "error", title: "Matriz Workbench", message })
    electron.app.quit()
  })
}
