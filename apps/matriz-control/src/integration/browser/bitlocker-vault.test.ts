import { describe, expect, it } from "vitest"
import { BitLockerVhdxVault, type VaultHelper, type VaultHelperResult, type VaultKeyStore } from "./bitlocker-vault"

describe("BitLockerVhdxVault", () => {
  it("diagnoses Windows support without exposing key material", async () => {
    const helper = new RecordingHelper({ supported: true, provisioned: false, mounted: false, mountPath: null, reason: null })
    const vault = new BitLockerVhdxVault({ platform: "win32", dataRoot: "C:\\Users\\dev\\AppData\\Local\\Matriz Control", helper, keys: new MemoryKeys() })

    await expect(vault.doctor()).resolves.toMatchObject({ supported: true, provisioned: false, mounted: false })
    expect(helper.requests).toEqual([{ operation: "status", vhdxPath: "C:\\Users\\dev\\AppData\\Local\\Matriz Control\\vault\\browser.vhdx", mountPath: "C:\\Users\\dev\\AppData\\Local\\Matriz Control\\runtime\\vault", recoveryKey: undefined }])
  })

  it("passes the recovery key through the protected helper field and never through paths", async () => {
    const helper = new RecordingHelper({ supported: true, provisioned: true, mounted: true, mountPath: "C:\\vault", reason: null })
    const keys = new MemoryKeys("111111-222222-333333-444444-555555-666666-777777-888888")
    const vault = new BitLockerVhdxVault({ platform: "win32", dataRoot: "C:\\Control", helper, keys })

    await vault.unlock()

    expect(helper.requests[0]).toMatchObject({ operation: "unlock", recoveryKey: "111111-222222-333333-444444-555555-666666-777777-888888" })
    expect(JSON.stringify({ ...helper.requests[0], recoveryKey: undefined })).not.toContain("111111")
  })

  it("refuses unsupported platforms and paths outside a mounted vault", async () => {
    const vault = new BitLockerVhdxVault({ platform: "linux", dataRoot: "/tmp/control", helper: new RecordingHelper(), keys: new MemoryKeys() })
    await expect(vault.unlock()).rejects.toThrow(/windows only/i)
    expect(() => vault.resolvePath("../escape")).toThrow(/invalid vault path/i)
  })

  it("preflights protected key storage before provisioning the encrypted volume", async () => {
    const helper = new RecordingHelper({ supported: true, provisioned: true, mounted: true, mountPath: "C:\\vault", reason: null })
    const vault = new BitLockerVhdxVault({ platform: "win32", dataRoot: "C:\\Control", helper, keys: new FailingKeys() })

    await expect(vault.provision()).rejects.toThrow(/protected storage/i)
    expect(helper.requests).toEqual([])
  })

  it("never overwrites an existing recovery key when provisioning is repeated", async () => {
    const original = "111111-222222-333333-444444-555555-666666-777777-888888"
    const keys = new MemoryKeys(original)
    const helper = new RecordingHelper({ supported: true, provisioned: true, mounted: false, mountPath: null, reason: null })
    const vault = new BitLockerVhdxVault({ platform: "win32", dataRoot: "C:\\Control", helper, keys })

    await expect(vault.provision()).rejects.toThrow(/already provisioned/i)
    await expect(keys.load()).resolves.toBe(original)
    expect(helper.requests).toEqual([{ operation: "status", vhdxPath: "C:\\Control\\vault\\browser.vhdx", mountPath: "C:\\Control\\runtime\\vault", recoveryKey: undefined }])
  })

  it("protects the final recovery password before the helper creates the VHDX", async () => {
    const keys = new MemoryKeys()
    const helper = new RecordingHelper({ supported: true, provisioned: true, mounted: true, mountPath: "C:\\vault", reason: null })
    const vault = new BitLockerVhdxVault({ platform: "win32", dataRoot: "C:\\Control", helper, keys })

    await vault.provision()

    const protectedKey = await keys.load()
    expect(protectedKey).toMatch(/^(?:\d{6}-){7}\d{6}$/)
    expect(helper.requests[0]?.recoveryKey).toBe(protectedKey)
    expect(protectedKey?.split("-").every((part) => Number(part) % 11 === 0)).toBe(true)
  })
})

class MemoryKeys implements VaultKeyStore {
  constructor(private value: string | undefined = undefined) {}
  async load() { return this.value }
  async save(value: string) { this.value = value }
  async clear() { this.value = undefined }
}

class FailingKeys implements VaultKeyStore {
  async load() { return undefined }
  async save() { throw new Error("protected storage unavailable") }
  async clear() {}
}

class RecordingHelper implements VaultHelper {
  requests: Parameters<VaultHelper["run"]>[0][] = []
  constructor(private result: VaultHelperResult = { supported: true, provisioned: false, mounted: false, mountPath: null, reason: null }) {}
  async run(request: Parameters<VaultHelper["run"]>[0]) { this.requests.push(request); return this.result }
}
