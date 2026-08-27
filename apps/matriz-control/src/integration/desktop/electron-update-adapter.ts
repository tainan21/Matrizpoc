import type { DesktopUpdateAdapter, DesktopUpdateAdapterEvent } from "../../application/desktop-update-coordinator"

type ReleaseInfo = { version: string; releaseNotes?: string | Array<{ note?: string }> | null }
export interface ElectronUpdaterPort {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  on(name: string, listener: (...args: any[]) => void): ElectronUpdaterPort
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(): void
}

export class ElectronUpdateAdapter implements DesktopUpdateAdapter {
  readonly packaged: boolean
  readonly currentVersion: string
  private readonly listeners = new Set<(event: DesktopUpdateAdapterEvent) => void>()

  constructor(private readonly updater: ElectronUpdaterPort, app: { packaged: boolean; version: string }) {
    this.packaged = app.packaged
    this.currentVersion = app.version
    updater.autoDownload = false
    updater.autoInstallOnAppQuit = false
    updater.on("checking-for-update", () => this.emit({ type: "checking" }))
    updater.on("update-available", (info: ReleaseInfo) => this.emit({ type: "available", version: info.version, notes: notes(info.releaseNotes) }))
    updater.on("update-not-available", () => this.emit({ type: "current" }))
    updater.on("download-progress", (progress: { percent?: number }) => this.emit({ type: "progress", percent: Number.isFinite(progress.percent) ? progress.percent! : 0 }))
    updater.on("update-downloaded", (info: ReleaseInfo) => this.emit({ type: "downloaded", version: info.version, notes: notes(info.releaseNotes) }))
    updater.on("error", (error: Error) => {
      const message = error?.message || "Falha ao verificar atualização."
      this.emit(/app-update\.yml|ERR_UPDATER_CHANNEL_FILE_NOT_FOUND/i.test(message)
        ? { type: "unavailable", message: "Canal de atualização não configurado neste pacote." }
        : { type: "error", message })
    })
  }

  async check() { await this.updater.checkForUpdates() }
  async download() { await this.updater.downloadUpdate() }
  install() { this.updater.quitAndInstall() }
  subscribe(listener: (event: DesktopUpdateAdapterEvent) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  private emit(event: DesktopUpdateAdapterEvent) { for (const listener of this.listeners) listener(event) }
}

function notes(value: ReleaseInfo["releaseNotes"]): string | null {
  if (typeof value === "string") return value.slice(0, 8_000)
  if (Array.isArray(value)) return value.map((entry) => entry.note).filter((note): note is string => typeof note === "string").join("\n").slice(0, 8_000) || null
  return null
}
