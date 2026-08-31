import { app, BrowserWindow, dialog, ipcMain } from "electron"
import { createHash, randomUUID } from "node:crypto"
import { readdir, readFile, stat } from "node:fs/promises"
import { spawn } from "node:child_process"
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
  const folders = new Map<string, string>()
  const localInstallers = new Map<string, { path: string; snapshot: any }>()
  const operations = new Map<string, any>()
  ipcMain.handle("matriz:local-folder:choose", async () => {
    const selected = await dialog.showOpenDialog({ properties: ["openDirectory"] })
    const folder = selected.filePaths[0]
    if (selected.canceled || !folder) return null
    const folderId = randomUUID()
    folders.set(folderId, folder)
    return { folderId, label: path.basename(folder) || "Pasta local" }
  })
  ipcMain.handle("matriz:local-folder:scan", async (_event, folderId: string) => {
    const folder = folders.get(folderId)
    if (!folder) throw new Error("Pasta local não pertence à sessão atual")
    const entries = await readdir(folder, { withFileTypes: true })
    const found = []
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".exe")) continue
      const file = path.join(folder, entry.name)
      const info = await stat(file)
      if (info.size <= 0 || info.size > 512 * 1024 * 1024) continue
      const sha256 = createHash("sha256").update(await readFile(file)).digest("hex")
      const installerId = sha256.slice(0, 24)
      const signed = await authenticodeIsMatriz(file)
      const snapshot = classifyLocalFile(entry.name, installerId, info.size, sha256, signed)
      localInstallers.set(installerId, { path: file, snapshot })
      found.push(snapshot)
    }
    return markLatest(found)
  })
  ipcMain.handle("matriz:installer:prepare", async (_event, source: any, action: string) => {
    const operationId = randomUUID()
    const local = source?.kind === "local" ? localInstallers.get(source.installerId) : null
    const requiredAcknowledgements = local?.snapshot.trust === "unsigned-development" ? ["unsigned-development"] : []
    const snapshot = { operationId, productId: local?.snapshot.productId ?? source?.productId ?? "unknown", version: local?.snapshot.version ?? "0.0.0", phase: "awaiting_confirmation", bytesDownloaded: 0, totalBytes: local?.snapshot.sizeBytes ?? null, requiredAcknowledgements, message: `Pronto para ${action}.`, source }
    operations.set(operationId, snapshot)
    return snapshot
  })
  ipcMain.handle("matriz:installer:confirm", async (_event, operationId: string, acknowledgements: string[]) => {
    const operation = operations.get(operationId)
    if (!operation) throw new Error("Operação expirada")
    if (operation.requiredAcknowledgements.some((item: string) => !acknowledgements.includes(item))) throw new Error("Confirmação adicional obrigatória")
    if (operation.source.kind === "local") {
      const local = localInstallers.get(operation.source.installerId)
      if (!local) throw new Error("Instalador local expirou")
      const bytes = await readFile(local.path)
      if (createHash("sha256").update(bytes).digest("hex") !== local.snapshot.sha256) throw new Error("Arquivo local mudou após a inspeção")
      if (local.snapshot.trust === "signed-matriz" && !(await authenticodeIsMatriz(local.path))) throw new Error("Assinatura local mudou após a inspeção")
      operations.set(operationId, { ...operation, phase: "installing", message: "Instalador em execução." })
      await new Promise<void>((resolve, reject) => { const child = spawn(local.path, ["/S"], { shell: false, windowsHide: true, stdio: "ignore" }); child.once("error", reject); child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Instalador terminou com ${code}`))) })
    } else {
      const result = await install(operation.productId, installerCache)
      if (result.status !== "completed") throw new Error(result.message)
    }
    const completed = { ...operation, phase: "completed", message: "Instalação concluída e validada." }
    operations.set(operationId, completed)
    return completed
  })
  ipcMain.handle("matriz:installer:cancel", (_event, operationId: string) => { const current = operations.get(operationId); const next = { ...current, operationId, phase: "cancelled", message: "Operação cancelada." }; operations.set(operationId, next); return next })
  ipcMain.handle("matriz:installer:status", (_event, operationId: string) => operations.get(operationId) ?? { operationId, productId: "unknown", version: "0.0.0", phase: "failed", bytesDownloaded: 0, totalBytes: null, requiredAcknowledgements: [], message: "Operação expirada." })
  createWindow()
})
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

const localPatterns = [
  ["matriz-control-tauri", /^matriz-control-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Control"],
  ["matriz-control-electron", /^matriz-control-electron-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Control Electron"],
  ["matriz-admin-tauri", /^matriz-admin-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Admin"],
  ["matriz-ops-tauri", /^matriz-ops-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Ops"],
  ["matriz-uninstall-tauri", /^matriz-uninstall-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Uninstall"],
  ["matriz-uninstall-electron", /^matriz-uninstall-electron-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Uninstall Electron"],
  ["matriz-workbench-electron", /^matriz-workbench-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Matriz Workbench"],
  ["seumei-electron", /^seumei-(\d+\.\d+\.\d+)-windows-x64-setup\.exe$/i, "Seumei"],
] as const
function classifyLocalFile(fileName: string, installerId: string, sizeBytes: number, sha256: string, signed: boolean) { const definition = localPatterns.find(([, pattern]) => pattern.test(fileName)); const version = definition?.[1].exec(fileName)?.[1]; return definition && version ? { installerId, productId: definition[0], displayName: definition[2], version, sizeBytes, sha256, trust: signed ? "signed-matriz" : "unsigned-development", isLatestForProduct: false, isDowngrade: false, message: signed ? "Assinatura Matriz válida." : "Build local de desenvolvimento não assinado." } : { installerId, productId: "unknown", displayName: fileName, version: "0.0.0", sizeBytes, sha256, trust: "blocked", isLatestForProduct: false, isDowngrade: false, message: "Arquivo não permitido." } }
function markLatest(items: any[]) { const latest = new Map<string,string>(); for (const item of items) if (item.trust !== "blocked" && (!latest.has(item.productId) || compareVersion(item.version, latest.get(item.productId)! ) > 0)) latest.set(item.productId, item.version); return items.map((item) => ({ ...item, isLatestForProduct: latest.get(item.productId) === item.version })).sort((a,b) => a.productId.localeCompare(b.productId) || compareVersion(b.version,a.version)) }
function compareVersion(left: string, right: string) { const l=left.split(".").map(Number), r=right.split(".").map(Number); return (l[0]??0)-(r[0]??0)||(l[1]??0)-(r[1]??0)||(l[2]??0)-(r[2]??0) }
async function authenticodeIsMatriz(file: string) { if (process.platform !== "win32") return false; const escaped=file.replace(/'/g,"''"); const output=await new Promise<string>((resolve)=>{const child=spawn("powershell.exe",["-NoProfile","-NonInteractive","-Command",`Get-AuthenticodeSignature -LiteralPath '${escaped}' | Select-Object Status,@{n='Subject';e={$_.SignerCertificate.Subject}} | ConvertTo-Json -Compress`],{windowsHide:true,stdio:["ignore","pipe","ignore"]});let text="";child.stdout.setEncoding("utf8");child.stdout.on("data",(chunk)=>text+=chunk);child.once("error",()=>resolve(""));child.once("exit",()=>resolve(text))}); try { const value=JSON.parse(output); return value.Status === "Valid" && /(?:CN|O)=Matriz(?:,|$)/i.test(String(value.Subject??"")) } catch { return false } }
