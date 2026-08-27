import { describe, expect, it } from "vitest"
import { generateKeyPairSync } from "node:crypto"
import { assertSigningConfiguration, createReleaseManifest, serializeReleaseManifest, signReleaseManifest, verifyReleaseManifestSignature } from "./release-manifest"

describe("desktop release manifest", () => {
  it("produces the required deterministic Windows x64 installer manifest", () => {
    const manifest = createReleaseManifest({
      version: "1.2.3",
      releasedAt: "2026-08-27T12:00:00.000Z",
      minimumControlVersion: "0.1.0",
      releaseNotes: null,
      downloadUrl: "https://releases.matriz.example/seumei-1.2.3-windows-x64-setup.exe",
      sizeBytes: 123456,
      sha256: "a".repeat(64),
    })

    expect(manifest).toEqual({
      schemaVersion: "v1",
      appId: "seumei",
      version: "1.2.3",
      channel: "stable",
      platform: "win32",
      arch: "x64",
      releasedAt: "2026-08-27T12:00:00.000Z",
      minimumControlVersion: "0.1.0",
      releaseNotes: null,
      installer: {
        fileName: "seumei-1.2.3-windows-x64-setup.exe",
        downloadUrl: "https://releases.matriz.example/seumei-1.2.3-windows-x64-setup.exe",
        sizeBytes: 123456,
        sha256: "a".repeat(64),
      },
    })
    expect(serializeReleaseManifest(manifest)).toContain('"schemaVersion": "v1"')
  })

  it("fails a release clearly when the signing certificate is absent", () => {
    expect(() => assertSigningConfiguration({})).toThrow(
      "CSC_LINK is required for a signed Windows release",
    )
  })

  it("accepts an explicitly supplied signing certificate reference", () => {
    expect(assertSigningConfiguration({ CSC_LINK: "C:/secure/seumei.pfx" })).toBe(
      "C:/secure/seumei.pfx",
    )
  })

  it("signs the exact serialized Store manifest with Ed25519", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519")
    const payload = '{"schemaVersion":"v1"}\n'
    const signature = signReleaseManifest(payload, privateKey.export({ format: "pem", type: "pkcs8" }).toString())
    expect(verifyReleaseManifestSignature(payload, signature, publicKey.export({ format: "pem", type: "spki" }).toString())).toBe(true)
    expect(verifyReleaseManifestSignature(`${payload}x`, signature, publicKey.export({ format: "pem", type: "spki" }).toString())).toBe(false)
  })
})
