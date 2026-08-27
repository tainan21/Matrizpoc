import { createHash, verify } from "node:crypto"

export type InstallationKind = "activation" | "windows_installer"
export type StorePackageKind = InstallationKind
export type NativeStoreState = "unavailable" | "available" | "downloading" | "downloaded" | "cancelled" | "installing" | "installed" | "update_available" | "failed"

export interface StorePackageDefinition {
  readonly appId: "matriz-workbench" | "seumei"
  readonly name: string
  readonly kind: "windows_installer"
  readonly releaseId: string
  readonly windows: {
    readonly appUserModelId: string
    readonly displayName: string
    readonly publisher: string
  }
}

export interface StorePackageSnapshot {
  readonly appId: string
  readonly kind: StorePackageKind
  readonly state: NativeStoreState
  readonly version: string | null
  readonly availableVersion: string | null
  readonly bytesDownloaded: number
  readonly totalBytes: number | null
  readonly message: string
}

export interface StorePackageManifest {
  readonly schemaVersion: "v1"
  readonly appId: "matriz-workbench" | "seumei"
  readonly version: string
  readonly channel: "stable"
  readonly platform: "win32"
  readonly arch: "x64"
  readonly releasedAt: string
  readonly minimumControlVersion: string
  readonly releaseNotes: string | null
  readonly installer: { readonly fileName: string; readonly downloadUrl: string; readonly sizeBytes: number; readonly sha256: string }
}

export interface SignedStorePackageManifest {
  readonly manifest: StorePackageManifest
  readonly signature: string
}

export interface StorePackageAdapters {
  readonly release: { fetch(releaseId: string): Promise<SignedStorePackageManifest> }
  readonly download: { stream(appId: string, url: string, onChunk: (chunk: Uint8Array) => void, signal: AbortSignal): Promise<string | void> }
  readonly authenticode: {
    verifyInstaller(appId: string): Promise<void>
    verifyInstalledExecutable(appId: string): Promise<void>
    verifyUninstaller(appId: string): Promise<void>
  }
  readonly packages: {
    install(appId: string): Promise<void>
    open(appId: string): Promise<void>
    uninstall(appId: string): Promise<void>
  }
  readonly registry: { observe(app: StorePackageDefinition): Promise<{ publisher: string; version: string } | null> }
}

interface StorePackageServiceOptions {
  readonly apps: readonly StorePackageDefinition[]
  readonly adapters: StorePackageAdapters
  readonly trust: { readonly publicKey: string | undefined; readonly publisher: string | undefined; readonly controlVersion: string; readonly maxInstallerBytes?: number }
}

const maximumInstallerBytes = 512 * 1024 * 1024

export class StorePackageService {
  private readonly states = new Map<string, StorePackageSnapshot>()
  private readonly downloaded = new Map<string, StorePackageManifest>()
  private readonly controllers = new Map<string, AbortController>()
  private readonly listeners = new Set<(snapshots: readonly StorePackageSnapshot[]) => void>()

  constructor(private readonly options: StorePackageServiceOptions) {
    for (const app of options.apps) this.states.set(app.appId, initialSnapshot(app, this.isTrusted() ? "available" : "unavailable"))
  }

  async status(): Promise<readonly StorePackageSnapshot[]> {
    for (const app of this.options.apps) await this.refreshObservation(app)
    return this.snapshots()
  }

  subscribe(listener: (snapshots: readonly StorePackageSnapshot[]) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener) }

  async download(appId: string): Promise<StorePackageSnapshot> {
    const app = this.app(appId)
    this.requireTrusted()
    if (this.controllers.has(appId)) return this.snapshot(appId)
    const controller = new AbortController()
    this.controllers.set(appId, controller)
    let bytesDownloaded = 0
    try {
      const signed = await this.options.adapters.release.fetch(app.releaseId)
      const release = validateManifest(signed.manifest)
      this.validateRelease(app, release, signed.signature)
      this.set(appId, { state: "downloading", version: null, availableVersion: release.version, bytesDownloaded: 0, totalBytes: release.installer.sizeBytes, message: "Baixando instalador assinado…" })
      const hash = createHash("sha256")
      const finalUrl = await this.options.adapters.download.stream(appId, release.installer.downloadUrl, (chunk) => {
        if (controller.signal.aborted) return
        bytesDownloaded += chunk.byteLength
        if (bytesDownloaded > release.installer.sizeBytes) throw new Error("Installer exceeds its signed size")
        hash.update(chunk)
        this.set(appId, { state: "downloading", version: null, availableVersion: release.version, bytesDownloaded, totalBytes: release.installer.sizeBytes, message: "Baixando instalador assinado…" })
      }, controller.signal)
      if (finalUrl) assertAllowedDownloadUrl(finalUrl)
      if (controller.signal.aborted) return this.cancelled(appId)
      if (bytesDownloaded !== release.installer.sizeBytes) throw new Error("Installer size does not match the signed manifest")
      if (hash.digest("hex") !== release.installer.sha256) throw new Error("Installer SHA-256 does not match the signed manifest")
      this.downloaded.set(appId, release)
      this.set(appId, { state: "downloaded", version: null, availableVersion: release.version, bytesDownloaded, totalBytes: release.installer.sizeBytes, message: "Instalador verificado e pronto." })
      return this.snapshot(appId)
    } catch (error) {
      if (controller.signal.aborted) return this.cancelled(appId)
      this.downloaded.delete(appId)
      this.set(appId, { state: "failed", version: null, availableVersion: null, bytesDownloaded: 0, totalBytes: null, message: message(error) })
      throw error
    } finally {
      this.controllers.delete(appId)
    }
  }

  async cancelDownload(appId: string): Promise<StorePackageSnapshot> {
    this.app(appId)
    this.controllers.get(appId)?.abort()
    return this.cancelled(appId)
  }

  async install(appId: string): Promise<StorePackageSnapshot> {
    const app = this.app(appId)
    this.requireTrusted()
    if (!this.downloaded.has(appId)) throw new Error("The signed installer must be downloaded before installation")
    this.set(appId, { state: "installing", version: null, availableVersion: this.downloaded.get(appId)?.version ?? null, bytesDownloaded: 0, totalBytes: null, message: "Instalando pacote nativo…" })
    try {
      await this.options.adapters.authenticode.verifyInstaller(appId)
      await this.options.adapters.packages.install(appId)
      const observed = await this.options.adapters.registry.observe(app)
      const release = this.downloaded.get(appId)
      if (!observed || observed.publisher !== this.options.trust.publisher || observed.version !== release?.version) throw new Error("Windows did not confirm the trusted installed package")
      this.set(appId, { state: "installed", version: observed.version, availableVersion: null, bytesDownloaded: 0, totalBytes: null, message: "Instalado e confirmado pelo Windows." })
      return this.snapshot(appId)
    } catch (error) {
      this.set(appId, { state: "failed", version: null, availableVersion: null, bytesDownloaded: 0, totalBytes: null, message: message(error) })
      throw error
    }
  }

  async open(appId: string): Promise<StorePackageSnapshot> {
    const app = this.app(appId)
    await this.requireInstalled(app)
    await this.options.adapters.authenticode.verifyInstalledExecutable(appId)
    await this.options.adapters.packages.open(appId)
    return this.snapshot(appId)
  }

  async uninstall(appId: string): Promise<StorePackageSnapshot> {
    const app = this.app(appId)
    await this.requireInstalled(app)
    await this.options.adapters.authenticode.verifyUninstaller(appId)
    await this.options.adapters.packages.uninstall(appId)
    if (await this.options.adapters.registry.observe(app)) throw new Error("Windows did not confirm package removal")
    this.downloaded.delete(appId)
    this.set(appId, { state: "available", version: null, availableVersion: null, bytesDownloaded: 0, totalBytes: null, message: "Disponível para instalação." })
    return this.snapshot(appId)
  }

  async checkUpdate(appId: string): Promise<StorePackageSnapshot> {
    const app = this.app(appId)
    this.requireTrusted()
    const signed = await this.options.adapters.release.fetch(app.releaseId)
    const release = validateManifest(signed.manifest)
    this.validateRelease(app, release, signed.signature)
    const observed = await this.options.adapters.registry.observe(app)
    if (observed && compareVersion(release.version, observed.version) > 0) this.set(appId, { state: "update_available", version: observed.version, availableVersion: release.version, bytesDownloaded: 0, totalBytes: release.installer.sizeBytes, message: "Atualização assinada disponível." })
    return this.snapshot(appId)
  }

  private async requireInstalled(app: StorePackageDefinition) {
    this.requireTrusted()
    const observed = await this.options.adapters.registry.observe(app)
    if (!observed || observed.publisher !== this.options.trust.publisher) throw new Error("The trusted package is not installed")
    this.set(app.appId, { state: "installed", version: observed.version, availableVersion: null, bytesDownloaded: 0, totalBytes: null, message: "Instalado e confirmado pelo Windows." })
  }

  private async refreshObservation(app: StorePackageDefinition) {
    if (!this.isTrusted()) { this.set(app.appId, { state: "unavailable", version: null, availableVersion: null, bytesDownloaded: 0, totalBytes: null, message: "Instalação nativa indisponível sem chave de confiança e publisher." }); return }
    if (this.controllers.has(app.appId) || this.downloaded.has(app.appId)) return
    const observed = await this.options.adapters.registry.observe(app)
    if (observed && observed.publisher === this.options.trust.publisher) this.set(app.appId, { state: "installed", version: observed.version, availableVersion: null, bytesDownloaded: 0, totalBytes: null, message: "Instalado e confirmado pelo Windows." })
    else this.set(app.appId, { state: "available", version: null, availableVersion: null, bytesDownloaded: 0, totalBytes: null, message: "Disponível para instalação." })
  }

  private validateRelease(app: StorePackageDefinition, release: StorePackageManifest, signature: string) {
    if (release.appId !== app.appId || release.platform !== "win32" || release.arch !== "x64") throw new Error("Release does not match the approved Windows package")
    if (compareVersion(this.options.trust.controlVersion, release.minimumControlVersion) < 0) throw new Error("This release requires a newer Matriz Control")
    assertAllowedDownloadUrl(release.installer.downloadUrl)
    if (release.installer.sizeBytes > (this.options.trust.maxInstallerBytes ?? maximumInstallerBytes)) throw new Error("Installer exceeds the local size limit")
    const publicKey = this.options.trust.publicKey
    if (!publicKey || !signature || !verify(null, Buffer.from(canonicalStorePackageManifest(release)), publicKey, Buffer.from(signature, "base64"))) throw new Error("Release manifest signature is invalid")
  }

  private app(appId: string) {
    const found = this.options.apps.find((app) => app.appId === appId)
    if (!found) throw new Error("Unknown Store app")
    return found
  }

  private isTrusted() { return Boolean(this.options.trust.publicKey && this.options.trust.publisher) }
  private requireTrusted() { if (!this.isTrusted()) throw new Error("Native Store is unavailable without trust configuration") }
  private cancelled(appId: string) { this.downloaded.delete(appId); this.set(appId, { state: "cancelled", version: null, availableVersion: null, bytesDownloaded: 0, totalBytes: null, message: "Download cancelado." }); return this.snapshot(appId) }
  private snapshot(appId: string) { const snapshot = this.states.get(appId); if (!snapshot) throw new Error("Unknown Store app"); return { ...snapshot } }
  private snapshots() { return this.options.apps.map((app) => this.snapshot(app.appId)) }
  private set(appId: string, changes: Omit<StorePackageSnapshot, "appId" | "kind">) {
    const current = this.snapshot(appId)
    this.states.set(appId, { ...current, ...changes })
    const snapshots = this.snapshots()
    for (const listener of this.listeners) listener(snapshots)
  }
}

function assertAllowedDownloadUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== "https:" || !["github.com", "objects.githubusercontent.com"].includes(url.hostname)) throw new Error("Installer download origin and redirects must use the GitHub HTTPS allowlist")
}

export function canonicalStorePackageManifest(manifest: StorePackageManifest): string {
  return JSON.stringify(sortObject(manifest))
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject)
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, sortObject(nested)]))
  return value
}

function initialSnapshot(app: StorePackageDefinition, state: NativeStoreState): StorePackageSnapshot {
  return { appId: app.appId, kind: app.kind, state, version: null, availableVersion: null, bytesDownloaded: 0, totalBytes: null, message: state === "unavailable" ? "Instalação nativa indisponível sem chave de confiança e publisher." : "Disponível para instalação." }
}

function message(error: unknown) { return error instanceof Error ? error.message : "Falha na operação do pacote nativo" }

function compareVersion(left: string, right: string) {
  const values = (value: string) => value.split("-")[0].split(".").map(Number)
  const [leftMajor, leftMinor, leftPatch] = values(left)
  const [rightMajor, rightMinor, rightPatch] = values(right)
  return leftMajor - rightMajor || leftMinor - rightMinor || leftPatch - rightPatch
}

function validateManifest(value: unknown): StorePackageManifest {
  if (!value || typeof value !== "object") throw new Error("Invalid signed release manifest")
  const manifest = value as Partial<StorePackageManifest>
  const installer = manifest.installer
  if (manifest.schemaVersion !== "v1" || (manifest.appId !== "matriz-workbench" && manifest.appId !== "seumei") || manifest.channel !== "stable" || manifest.platform !== "win32" || manifest.arch !== "x64" || typeof manifest.version !== "string" || typeof manifest.minimumControlVersion !== "string" || !installer || typeof installer.fileName !== "string" || typeof installer.downloadUrl !== "string" || !Number.isSafeInteger(installer.sizeBytes) || installer.sizeBytes <= 0 || !/^[a-f0-9]{64}$/.test(installer.sha256 ?? "")) throw new Error("Invalid signed release manifest")
  return value as StorePackageManifest
}
