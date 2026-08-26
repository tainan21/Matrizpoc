import type { DesktopUpdateSnapshot } from "../domain/desktop-bridge"

export type DesktopUpdateAdapterEvent =
  | { type: "unavailable"; message: string }
  | { type: "checking" }
  | { type: "available"; version: string; notes: string | null }
  | { type: "current" }
  | { type: "progress"; percent: number }
  | { type: "downloaded"; version: string; notes: string | null }
  | { type: "error"; message: string }

export interface DesktopUpdateAdapter {
  readonly packaged: boolean
  readonly currentVersion: string
  check(): Promise<void>
  download(): Promise<void>
  install(): void
  subscribe(listener: (event: DesktopUpdateAdapterEvent) => void): () => void
}

export class DesktopUpdateCoordinator {
  private snapshotValue: DesktopUpdateSnapshot
  private readonly listeners = new Set<(snapshot: DesktopUpdateSnapshot) => void>()

  constructor(private readonly adapter: DesktopUpdateAdapter) {
    this.snapshotValue = adapter.packaged
      ? snapshot("idle", adapter.currentVersion, "Pronto para verificar atualizações.")
      : snapshot("unavailable", adapter.currentVersion, "Atualizações estão disponíveis somente no aplicativo instalado.")
    adapter.subscribe((event) => this.receive(event))
  }

  status() { return { ...this.snapshotValue } }
  subscribe(listener: (snapshot: DesktopUpdateSnapshot) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener) }

  async check() {
    if (!this.adapter.packaged) return this.status()
    this.set({ ...this.snapshotValue, state: "checking", progress: null, message: "Verificando atualizações…" })
    try { await this.adapter.check() } catch (error) { this.fail(error) }
    return this.status()
  }

  async download() {
    if (this.snapshotValue.state !== "available") throw new Error("No update is available to download")
    this.set({ ...this.snapshotValue, state: "downloading", progress: 0, message: "Baixando atualização…" })
    try { await this.adapter.download() } catch (error) { this.fail(error) }
    return this.status()
  }

  install() {
    if (this.snapshotValue.state !== "downloaded") throw new Error("The update must be downloaded before installation")
    this.adapter.install()
  }

  private receive(event: DesktopUpdateAdapterEvent) {
    if (event.type === "unavailable") this.set({ ...snapshot("unavailable", this.adapter.currentVersion, event.message) })
    if (event.type === "checking") this.set({ ...this.snapshotValue, state: "checking", message: "Verificando atualizações…" })
    if (event.type === "available") this.set({ state: "available", currentVersion: this.adapter.currentVersion, availableVersion: event.version, progress: null, notes: event.notes, message: `Versão ${event.version} disponível.` })
    if (event.type === "current") this.set(snapshot("current", this.adapter.currentVersion, "Você já está na versão mais recente."))
    if (event.type === "progress") this.set({ ...this.snapshotValue, state: "downloading", progress: Math.max(0, Math.min(100, Math.round(event.percent))), message: "Baixando atualização…" })
    if (event.type === "downloaded") this.set({ state: "downloaded", currentVersion: this.adapter.currentVersion, availableVersion: event.version, progress: 100, notes: event.notes, message: "Atualização pronta. Reinicie para instalar." })
    if (event.type === "error") this.set({ ...this.snapshotValue, state: "error", progress: null, message: event.message })
  }

  private fail(error: unknown) { this.receive({ type: "error", message: error instanceof Error ? error.message : "Falha ao atualizar." }) }
  private set(next: DesktopUpdateSnapshot) { this.snapshotValue = next; for (const listener of this.listeners) listener(this.status()) }
}

function snapshot(state: DesktopUpdateSnapshot["state"], currentVersion: string, message: string): DesktopUpdateSnapshot {
  return { state, currentVersion, availableVersion: null, progress: null, notes: null, message }
}
