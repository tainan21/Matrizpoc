import { generateKeyPairSync } from "node:crypto"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { writeDesktopReleaseManifest } from "./create-desktop-release-manifest"
import { verifyReleaseManifestSignature } from "../desktop/release-manifest"

describe("writeDesktopReleaseManifest", () => {
  it("hashes the NSIS artifact and writes a signed StorePackageManifestV1", async () => {
    const directory = await mkdtemp(join(tmpdir(), "seumei-desktop-manifest-"))
    const installerPath = join(directory, "seumei-1.2.3-windows-x64-setup.exe")
    const outputPath = join(directory, "release-manifest.json")
    const { privateKey, publicKey } = generateKeyPairSync("ed25519")
    try {
      await writeFile(installerPath, "signed-installer-bytes")
      await writeDesktopReleaseManifest({ version: "1.2.3", installerPath, outputPath, downloadUrl: "https://releases.matriz.example/seumei-1.2.3-windows-x64-setup.exe", releasedAt: "2026-08-27T12:00:00.000Z", minimumControlVersion: "0.1.0", releaseNotes: null, signingPrivateKeyPem: privateKey.export({ format: "pem", type: "pkcs8" }).toString() })
      const payload = await readFile(outputPath, "utf8")
      const manifest = JSON.parse(payload)
      expect(manifest.installer.fileName).toBe("seumei-1.2.3-windows-x64-setup.exe")
      expect(manifest.installer.downloadUrl).toBe("https://releases.matriz.example/seumei-1.2.3-windows-x64-setup.exe")
      expect(manifest.installer.sizeBytes).toBe(22)
      expect(manifest.installer.sha256).toMatch(/^[a-f0-9]{64}$/)
      const signature = await readFile(`${outputPath}.sig`, "utf8")
      expect(verifyReleaseManifestSignature(payload, signature.trim(), publicKey.export({ format: "pem", type: "spki" }).toString())).toBe(true)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
})
