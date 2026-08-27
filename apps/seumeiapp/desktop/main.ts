import { createElectronSecurityPolicy } from "./electron-security"
import { createOfflinePage } from "./offline-page"
import { resolveDesktopRuntimeConfig } from "./runtime-config"
import { BUILT_SEUMEI_APP_URL, BUILT_SEUMEI_HUB_URL } from "./build-config"
import { attachNavigationGuards } from "./navigation-guards"
import { createManualUpdater } from "./manual-updater"

const { app, BrowserWindow, dialog, Menu, session, shell } = require("electron")
const { autoUpdater } = require("electron-updater")

function installManualUpdateMenu(): void {
  const updater = createManualUpdater(autoUpdater)
  Menu.setApplicationMenu(Menu.buildFromTemplate([{
    label: "Seumei",
    submenu: [
      { label: "Verificar atualizações", click: () => void updater.check().catch((error) => dialog.showErrorBox("Atualização indisponível", error instanceof Error ? error.message : String(error))) },
      { label: "Baixar atualização disponível", click: () => void updater.download().catch((error) => dialog.showErrorBox("Download indisponível", error instanceof Error ? error.message : String(error))) },
      { label: "Instalar atualização baixada", click: () => updater.install() },
      { type: "separator" }, { role: "quit" },
    ],
  }]))
}

function loadOfflinePage(window: { loadURL: (url: string) => Promise<void> }, reason: string): void {
  void window.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(createOfflinePage(reason))}`)
}

function createWindow(allowedOrigins: readonly string[]) {
  const security = createElectronSecurityPolicy(allowedOrigins)
  const browserWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    webPreferences: security.browserWindowOptions,
  })
  const persistentSession = session.fromPartition(security.browserWindowOptions.partition)

  persistentSession.setPermissionCheckHandler(() => security.permitsPermission(""))
  persistentSession.setPermissionRequestHandler((_webContents: unknown, _permission: string, callback: (allowed: boolean) => void) => {
    callback(security.permitsPermission(_permission))
  })
  persistentSession.on("will-download", (event: { preventDefault: () => void }) => {
    if (!security.permitsDownload()) event.preventDefault()
  })

  attachNavigationGuards(browserWindow.webContents, allowedOrigins, (url) => shell.openExternal(url), (reason) => loadOfflinePage(browserWindow, reason))

  return browserWindow
}

async function startDesktopShell(): Promise<void> {
  try {
    const configuration = resolveDesktopRuntimeConfig({ isPackaged: app.isPackaged, builtAppUrl: BUILT_SEUMEI_APP_URL, builtHubUrl: BUILT_SEUMEI_HUB_URL })
    const browserWindow = createWindow(configuration.allowedOrigins)
    try {
      await browserWindow.loadURL(configuration.seumeiOrigin)
    } catch {
      loadOfflinePage(browserWindow, "Não foi possível alcançar o Seumei configurado.")
    }
  } catch (error) {
    const browserWindow = createWindow([])
    const reason = error instanceof Error ? error.message : "A configuração do desktop é inválida."
    loadOfflinePage(browserWindow, reason)
  }
}

app.whenReady().then(async () => {
  installManualUpdateMenu()
  await startDesktopShell()
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void startDesktopShell()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
