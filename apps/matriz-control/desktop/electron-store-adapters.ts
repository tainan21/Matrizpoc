import { spawn } from "node:child_process"
import { mkdir, open, rename, rm } from "node:fs/promises"
import { basename, isAbsolute, join, win32 } from "node:path"
import type { SignedStorePackageManifest, StorePackageAdapters, StorePackageDefinition } from "../src/application/store-package-service"

const uninstallRoots = [
  "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  "HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
]

const nativeFiles: Record<StorePackageDefinition["appId"], { executable: string; uninstaller: string }> = {
  "matriz-workbench": { executable: "Matriz Workbench.exe", uninstaller: "Uninstall Matriz Workbench.exe" },
  seumei: { executable: "Seumei.exe", uninstaller: "Uninstall Seumei.exe" },
  "matriz-uninstall": { executable: "matriz-uninstall-tauri.exe", uninstaller: "uninstall.exe" },
}

interface ElectronStoreAdapterOptions {
  readonly packageDirectory: string
  readonly releaseUrls: Readonly<Record<string, string | undefined>>
  readonly apps: readonly StorePackageDefinition[]
}

export class ElectronStorePackageAdapters implements StorePackageAdapters {
  readonly release = { fetch: (releaseId: string) => this.fetchRelease(releaseId) }
  readonly download = { stream: (appId: string, url: string, onChunk: (chunk: Uint8Array) => void, signal: AbortSignal) => this.streamInstaller(appId, url, onChunk, signal) }
  readonly authenticode = {
    verifyInstaller: (appId: string) => this.verifyAuthenticode(this.installerPath(appId), this.app(appId).windows.publisher),
    verifyInstalledExecutable: async (appId: string) => this.verifyInstalledFile(appId, "executable"),
    verifyUninstaller: async (appId: string) => this.verifyInstalledFile(appId, "uninstaller"),
  }
  readonly packages = {
    install: (appId: string) => this.install(appId),
    open: (appId: string) => this.open(appId),
    uninstall: (appId: string) => this.uninstall(appId),
  }
  readonly registry = { observe: async (app: StorePackageDefinition) => {
    const observed = await this.findInstalled(app)
    return observed ? { publisher: observed.publisher, version: observed.version } : null
  } }

  constructor(private readonly options: ElectronStoreAdapterOptions) {}

  private async fetchRelease(releaseId: string): Promise<SignedStorePackageManifest> {
    const url = this.options.releaseUrls[releaseId]
    if (!url) throw new Error("No trusted release manifest is configured for this package")
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) throw new Error("Trusted release manifest is unavailable")
    return await response.json() as SignedStorePackageManifest
  }

  private async streamInstaller(appId: string, url: string, onChunk: (chunk: Uint8Array) => void, signal: AbortSignal) {
    await mkdir(this.options.packageDirectory, { recursive: true })
    const target = this.installerPath(appId)
    const partial = `${target}.part`
    await rm(partial, { force: true })
    const response = await fetch(url, { cache: "no-store", signal })
    if (!response.ok || !response.body) throw new Error("Installer download is unavailable")
    const file = await open(partial, "w")
    try {
      const reader = response.body.getReader()
      while (true) {
        const next = await reader.read()
        if (next.done) break
        if (signal.aborted) throw new DOMException("Aborted", "AbortError")
        await file.write(next.value)
        onChunk(next.value)
      }
      await file.close()
      await rename(partial, target)
      return response.url
    } catch (error) {
      await file.close().catch(() => undefined)
      await rm(partial, { force: true })
      await rm(target, { force: true })
      throw error
    }
  }

  private async install(appId: string) {
    await this.run(this.installerPath(appId), ["/S"])
  }

  private async open(appId: string) {
    const app = this.app(appId)
    const observed = await this.findInstalled(app)
    if (!observed?.installLocation) throw new Error("Windows installation location is unavailable")
    await this.run(safeInstalledPath(observed.installLocation, nativeFiles[app.appId].executable), [])
  }

  private async uninstall(appId: string) {
    const app = this.app(appId)
    const observed = await this.findInstalled(app)
    if (!observed?.installLocation) throw new Error("Windows installation location is unavailable")
    await this.run(safeInstalledPath(observed.installLocation, nativeFiles[app.appId].uninstaller), ["/S"])
  }

  private installerPath(appId: string) { return join(this.options.packageDirectory, `${appId}-setup.exe`) }
  private app(appId: string) { const app = this.options.apps.find((candidate) => candidate.appId === appId); if (!app) throw new Error("Unknown Store app"); return app }

  private async findInstalled(app: StorePackageDefinition): Promise<{ publisher: string; version: string; installLocation: string | null } | null> {
    if (process.platform !== "win32") return null
    for (const root of uninstallRoots) {
      const output = await runCapture("reg.exe", ["query", root, "/s"])
      let key: string | null = null
      for (const line of output.split(/\r?\n/)) {
        if (line.startsWith("HKEY_")) { key = line.trim(); continue }
        if (!key || !/^\s*DisplayName\s+REG_\w+\s+/i.test(line)) continue
        const displayName = line.replace(/^\s*DisplayName\s+REG_\w+\s+/i, "").trim()
        if (displayName !== app.windows.displayName) continue
        if (!isApprovedUninstallKey(key, app.windows.appUserModelId)) continue
        const [publisher, version, installLocation] = await Promise.all([registryValue(key, "Publisher"), registryValue(key, "DisplayVersion"), registryValue(key, "InstallLocation")])
        if (!publisher || !version || publisher !== app.windows.publisher) return null
        return { publisher, version, installLocation: installLocation && isAbsolute(installLocation) ? installLocation : null }
      }
    }
    return null
  }

  private async verifyInstalledFile(appId: string, kind: "executable" | "uninstaller") {
    const app = this.app(appId)
    const observed = await this.findInstalled(app)
    if (!observed?.installLocation) throw new Error("Windows installation location is unavailable")
    await this.verifyAuthenticode(safeInstalledPath(observed.installLocation, nativeFiles[app.appId][kind]), app.windows.publisher)
  }

  private async verifyAuthenticode(file: string, publisher: string) {
    if (process.platform !== "win32") throw new Error("Authenticode verification requires Windows")
    const script = "$s=Get-AuthenticodeSignature -LiteralPath $args[0]; [pscustomobject]@{Status=[string]$s.Status;Subject=[string]$s.SignerCertificate.Subject}|ConvertTo-Json -Compress"
    const output = await runCapture("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script, file])
    let signature: { Status?: unknown; Subject?: unknown }
    try { signature = JSON.parse(output) as typeof signature } catch { throw new Error("Authenticode verification failed") }
    const subject = typeof signature.Subject === "string" ? signature.Subject : ""
    if (signature.Status !== "Valid" || !publisherSubjectMatches(subject, publisher)) throw new Error("Authenticode publisher is not trusted")
  }

  private async run(file: string, args: readonly string[]) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(file, [...args], { shell: false, windowsHide: true, stdio: "ignore" })
      child.once("error", () => reject(new Error("Trusted Windows package operation failed")))
      child.once("exit", (code) => code === 0 ? resolve() : reject(new Error("Trusted Windows package operation failed")))
    })
  }
}

export function safeInstalledPath(root: string, fileName: string) {
  const base = win32.resolve(root)
  const target = win32.resolve(base, fileName)
  const route = win32.relative(base, target)
  if (!route || route.startsWith("..") || win32.isAbsolute(route)) throw new Error("Installed package path is invalid")
  return target
}

export function publisherSubjectMatches(subject: string, publisher: string) {
  const escaped = publisher.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(?:^|,\\s*)(?:CN|O)=${escaped}(?:,|$)`, "i").test(subject)
}

export function isApprovedUninstallKey(key: string, appUserModelId: string) {
  return basename(key.replaceAll("\\", "/")) === appUserModelId
}

async function registryValue(key: string, name: string): Promise<string | null> {
  const output = await runCapture("reg.exe", ["query", key, "/v", name])
  const row = output.split(/\r?\n/).find((line) => new RegExp(`^\\s*${name}\\s+REG_\\w+\\s+`, "i").test(line))
  return row ? row.replace(new RegExp(`^\\s*${name}\\s+REG_\\w+\\s+`, "i"), "").trim() || null : null
}

async function runCapture(file: string, args: readonly string[]): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(file, [...args], { shell: false, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] })
    let output = ""
    child.stdout.setEncoding("utf8")
    child.stdout.on("data", (chunk) => { output += chunk })
    child.once("error", () => resolve(""))
    child.once("exit", () => resolve(output))
  })
}
