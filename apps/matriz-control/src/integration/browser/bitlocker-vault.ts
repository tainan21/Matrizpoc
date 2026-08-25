import { randomInt, randomUUID } from "node:crypto"
import { win32 } from "node:path"

export interface VaultStatus {
  supported: boolean
  provisioned: boolean
  mounted: boolean
  mountPath: string | null
  reason: string | null
}

export interface VaultBackend {
  doctor(): Promise<VaultStatus>
  provision(): Promise<VaultStatus>
  unlock(): Promise<VaultStatus>
  lock(): Promise<VaultStatus>
  status(): Promise<VaultStatus>
  resolvePath(relativePath: string): string
}

export interface VaultKeyStore {
  load(): Promise<string | undefined>
  save(value: string): Promise<void>
  clear(): Promise<void>
}

export interface VaultHelperRequest {
  operation: "status" | "provision" | "unlock" | "lock"
  vhdxPath: string
  mountPath: string
  recoveryKey?: string
  requestId?: string
}

export interface VaultHelperResult extends VaultStatus { recoveryKey?: string }
export interface VaultHelper { run(request: VaultHelperRequest): Promise<VaultHelperResult> }

export class BitLockerVhdxVault implements VaultBackend {
  private readonly vhdxPath: string
  private readonly mountPath: string
  private current: VaultStatus = { supported: false, provisioned: false, mounted: false, mountPath: null, reason: "Not checked" }

  constructor(private readonly options: { platform: NodeJS.Platform; dataRoot: string; helper: VaultHelper; keys: VaultKeyStore }) {
    this.vhdxPath = win32.join(options.dataRoot, "vault", "browser.vhdx")
    this.mountPath = win32.join(options.dataRoot, "runtime", "vault")
  }

  doctor() { return this.status() }

  async status() {
    if (this.options.platform !== "win32") return this.current = { supported: false, provisioned: false, mounted: false, mountPath: null, reason: "BitLocker VHDX is Windows only" }
    return this.current = await this.options.helper.run(this.request("status"))
  }

  async provision() {
    this.assertWindows()
    let recoveryKey = await this.options.keys.load()
    if (recoveryKey) {
      const existing = await this.options.helper.run(this.request("status"))
      if (existing.provisioned) throw new Error("Vault is already provisioned; unlock or lock the existing vault instead")
    } else {
      recoveryKey = createRecoveryPassword()
      await this.options.keys.save(recoveryKey)
    }
    const result = await this.options.helper.run({ ...this.request("provision"), recoveryKey, requestId: randomUUID() })
    if (!result.provisioned) throw new Error(result.reason ?? "Vault helper did not provision the encrypted volume")
    const { recoveryKey: _secret, ...status } = result
    return this.current = status
  }

  async unlock() {
    this.assertWindows()
    const recoveryKey = await this.options.keys.load()
    if (!recoveryKey) throw new Error("Vault is not provisioned")
    const result = await this.options.helper.run({ ...this.request("unlock"), recoveryKey })
    if (!result.mounted) throw new Error(result.reason ?? "Vault could not be mounted")
    const { recoveryKey: _secret, ...status } = result
    return this.current = status
  }

  async lock() {
    this.assertWindows()
    const result = await this.options.helper.run(this.request("lock"))
    const { recoveryKey: _secret, ...status } = result
    return this.current = status
  }

  resolvePath(relativePath: string) {
    if (!relativePath || win32.isAbsolute(relativePath) || relativePath.split(/[\\/]/).some((part) => !part || part === "..")) throw new Error("Invalid vault path")
    if (!this.current.mounted || !this.current.mountPath) throw new Error("Vault is locked")
    return win32.join(this.current.mountPath, relativePath)
  }

  private request(operation: VaultHelperRequest["operation"]): VaultHelperRequest { return { operation, vhdxPath: this.vhdxPath, mountPath: this.mountPath, recoveryKey: undefined } }
  private assertWindows() { if (this.options.platform !== "win32") throw new Error("BitLocker VHDX is Windows only") }
}

function createRecoveryPassword() {
  return Array.from({ length: 8 }, () => String(randomInt(0, 65_536) * 11).padStart(6, "0")).join("-")
}
