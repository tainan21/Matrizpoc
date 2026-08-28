import { app, BrowserWindow, ipcMain } from "electron"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  cleanup,
  cleanupPreview,
  discoverInstalled,
  install,
  launchDetachedUninstaller,
  uninstall,
  unsupported,
} from "./windows-operations.js"

const directory = path.dirname(fileURLToPath(import.meta.url))
function createWindow() {
  const window = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 940,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: path.join(directory, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  window.once("ready-to-show", () => window.show())
  if (!app.isPackaged) void window.loadURL("http://127.0.0.1:1430")
  else void window.loadFile(path.join(directory, "../../dist/index.html"))
}
app.whenReady().then(() => {
  ipcMain.handle("matriz:list-installed", () => discoverInstalled())
  const installerCache = path.join(app.getPath("userData"), "installers")
  ipcMain.handle("matriz:install", (_event, id: string) => install(id, installerCache))
  ipcMain.handle("matriz:update", (_event, id: string) => install(id, installerCache))
  ipcMain.handle("matriz:reinstall", async (_event, id: string, installationId: string) => {
    const removed = await uninstall(installationId)
    return removed.status === "completed" ? install(id, installerCache) : removed
  })
  ipcMain.handle("matriz:uninstall", (_event, id: string) => uninstall(id))
  ipcMain.handle("matriz:cleanup-preview", (_event, id: string) =>
    cleanupPreview(id, app.getPath("userData")),
  )
  ipcMain.handle("matriz:cleanup", (_event, _id: string, ids: readonly string[]) => cleanup(ids))
  ipcMain.handle("matriz:self-uninstall", async () => {
    const own = (await discoverInstalled()).find(
      (item) => item.displayName === "Matriz Uninstall Electron",
    )
    if (!own) return unsupported("Auto-desinstalação")
    const outcome = launchDetachedUninstaller(own.installationId)
    if (outcome.status === "completed") setImmediate(() => app.quit())
    return outcome
  })
  createWindow()
})
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
