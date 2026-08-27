import { generateKeyPairSync, sign } from "node:crypto"
import { describe, expect, it } from "vitest"
import type { StorePackageManifestV1 } from "@matriz/integration-api-contracts"
import {
  StorePackageService,
  canonicalStorePackageManifest,
  type StorePackageAdapters,
  type StorePackageDefinition,
} from "./store-package-service"

const workbench: StorePackageDefinition = {
  appId: "matriz-workbench",
  name: "Matriz Workbench",
  kind: "windows_installer",
  releaseId: "matriz-workbench-windows-x64-stable",
  windows: { appUserModelId: "com.matriz.workbench", displayName: "Matriz Workbench", publisher: "Matriz" },
}

const manifest: StorePackageManifestV1 = {
  schemaVersion: "v1",
  appId: "matriz-workbench",
  version: "0.1.0",
  channel: "stable",
  platform: "win32",
  arch: "x64",
  releasedAt: "2026-08-27T12:00:00.000Z",
  minimumControlVersion: "0.1.0",
  releaseNotes: null,
  installer: {
    fileName: "Matriz-Workbench-setup.exe",
    downloadUrl: "https://github.com/matriz/workbench/releases/download/v0.1.0/Matriz-Workbench-setup.exe",
    sizeBytes: 4,
    sha256: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
  },
}

function signedManifest() {
  const keys = generateKeyPairSync("ed25519")
  const signature = sign(null, Buffer.from(canonicalStorePackageManifest(manifest)), keys.privateKey).toString("base64")
  return { publicKey: keys.publicKey.export({ type: "spki", format: "pem" }).toString(), signed: { manifest, signature } }
}

function service(overrides: Partial<StorePackageAdapters> = {}, trusted = signedManifest()) {
  const calls: string[] = []
  const adapters: StorePackageAdapters = {
    release: { fetch: async () => trusted.signed },
    download: { stream: async (_appId, _url, onChunk) => { onChunk(Buffer.from("123")); onChunk(Buffer.from("4")) } },
    authenticode: { verifyInstaller: async () => undefined, verifyInstalledExecutable: async () => undefined, verifyUninstaller: async () => undefined },
    packages: {
      install: async (appId) => { calls.push(`install:${appId}`) },
      open: async (appId) => { calls.push(`open:${appId}`) },
      uninstall: async (appId) => { calls.push(`uninstall:${appId}`) },
    },
    registry: { observe: async () => null },
    ...overrides,
  }
  return { service: new StorePackageService({ apps: [workbench], adapters, trust: { publicKey: trusted.publicKey, publisher: "Matriz", controlVersion: "0.1.0" } }), calls }
}

describe("StorePackageService", () => {
  it("marks native packages unavailable when a production trust configuration is absent", async () => {
    const { service: tested } = service({}, { publicKey: "", signed: { manifest, signature: "" } })

    expect(await tested.status()).toMatchObject([{ appId: "matriz-workbench", state: "unavailable" }])
  })

  it("rejects a download whose final redirected origin leaves the allowlist", async () => {
    const { service: tested } = service({
      download: { stream: async (_appId, _url, onChunk) => { onChunk(Buffer.from("1234")); return "https://evil.example/installer.exe" } },
    })

    await expect(tested.download("matriz-workbench")).rejects.toThrow(/redirect|origin|GitHub/i)
  })

  it("downloads only a signed allowlisted release while hashing its streamed bytes", async () => {
    const { service: tested } = service()

    await expect(tested.download("matriz-workbench")).resolves.toMatchObject({ state: "downloaded", bytesDownloaded: 4 })
  })

  it("rejects an installer whose signature or GitHub HTTPS origin is not trusted", async () => {
    const invalid = signedManifest()
    const { service: invalidSignature } = service({}, { ...invalid, signed: { manifest, signature: "not-a-signature" } })
    const untrustedOrigin = { ...manifest, installer: { ...manifest.installer, downloadUrl: "https://downloads.example/installer.exe" } }
    const { service: invalidOrigin } = service({ release: { fetch: async () => ({ manifest: untrustedOrigin, signature: "" }) } })

    await expect(invalidSignature.download("matriz-workbench")).rejects.toThrow(/signature/i)
    await expect(invalidOrigin.download("matriz-workbench")).rejects.toThrow(/GitHub/i)
  })

  it("cancels a native download without retaining a partial installer", async () => {
    let receiveChunk: ((chunk: Uint8Array) => void) | undefined
    const { service: tested } = service({
      download: { stream: async (_appId, _url, onChunk, signal) => {
        receiveChunk = onChunk
        await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }))
      } },
    })

    const pending = tested.download("matriz-workbench")
    await Promise.resolve()
    receiveChunk?.(Buffer.from("12"))
    await tested.cancelDownload("matriz-workbench")

    await expect(pending).resolves.toMatchObject({ state: "cancelled", bytesDownloaded: 0 })
  })

  it("authorizes fixed install, open and uninstall operations from observed Windows identity", async () => {
    let installed = false
    const securityCalls: string[] = []
    const { service: tested, calls } = service({
      authenticode: {
        verifyInstaller: async (appId) => { securityCalls.push(`installer:${appId}`) },
        verifyInstalledExecutable: async (appId) => { securityCalls.push(`open:${appId}`) },
        verifyUninstaller: async (appId) => { securityCalls.push(`uninstall:${appId}`) },
      },
      packages: {
        install: async () => { installed = true },
        open: async (appId) => { calls.push(`open:${appId}`) },
        uninstall: async (appId) => { calls.push(`uninstall:${appId}`); installed = false },
      },
      registry: { observe: async () => installed ? { publisher: "Matriz", version: "0.1.0" } : null },
    })

    await expect(tested.open("matriz-workbench")).rejects.toThrow(/installed/i)
    await tested.download("matriz-workbench")
    await expect(tested.install("matriz-workbench")).resolves.toMatchObject({ state: "installed" })
    await tested.open("matriz-workbench")
    await expect(tested.uninstall("matriz-workbench")).resolves.toMatchObject({ state: "available" })

    expect(calls).toEqual(["open:matriz-workbench", "uninstall:matriz-workbench"])
    expect(securityCalls).toEqual(["installer:matriz-workbench", "open:matriz-workbench", "uninstall:matriz-workbench"])
  })

  it("uses canonical underscore installation kinds and states", async () => {
    const { service: tested } = service()
    expect(await tested.status()).toMatchObject([{ kind: "windows_installer", state: "available" }])
    await tested.download("matriz-workbench")
    await expect(tested.checkUpdate("matriz-workbench")).resolves.not.toMatchObject({ state: "update-available" })
  })
})
