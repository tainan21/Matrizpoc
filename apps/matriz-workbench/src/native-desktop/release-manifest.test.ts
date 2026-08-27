import { generateKeyPairSync, verify } from "node:crypto"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  assertWorkbenchReleaseSigning,
  buildWorkbenchReleaseManifest,
  serializeStoreManifest,
  signStoreManifest,
  writeWorkbenchReleaseManifest,
} from "./release-manifest"

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe("Workbench Windows release manifest", () => {
  it("produces a deterministic manifest for the declared NSIS setup artifact", () => {
    const input = {
      version: "0.1.0",
      sha256: "a".repeat(64),
      size: 42,
    }
    expect(buildWorkbenchReleaseManifest({
      ...input,
      downloadUrl: "https://releases.matriz.dev/matriz-workbench-0.1.0-windows-x64-setup.exe",
      releasedAt: "2026-08-27T12:00:00.000Z",
      minimumControlVersion: "0.1.0",
    })).toEqual({
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
        fileName: "matriz-workbench-0.1.0-windows-x64-setup.exe",
        downloadUrl: "https://releases.matriz.dev/matriz-workbench-0.1.0-windows-x64-setup.exe",
        sha256: "a".repeat(64),
        sizeBytes: 42,
      },
    })
  })

  it("signs the exact canonical manifest bytes with Ed25519", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519")
    const manifest = buildWorkbenchReleaseManifest({ version: "0.1.0", sha256: "a".repeat(64), size: 42,
      downloadUrl: "https://releases.matriz.dev/matriz-workbench-0.1.0-windows-x64-setup.exe",
      releasedAt: "2026-08-27T12:00:00.000Z", minimumControlVersion: "0.1.0" })
    const bytes = serializeStoreManifest(manifest)
    const signature = signStoreManifest(bytes, privateKey.export({ type: "pkcs8", format: "pem" }).toString())
    expect(verify(null, bytes, publicKey, Buffer.from(signature, "base64"))).toBe(true)
  })

  it("fails a release before packaging when the code-signing key is absent", () => {
    const { privateKey } = generateKeyPairSync("ed25519")
    expect(() => assertWorkbenchReleaseSigning({})).toThrow(
      "WORKBENCH_WINDOWS_SIGNING_CERTIFICATE ausente",
    )
    expect(() => assertWorkbenchReleaseSigning({
      WORKBENCH_WINDOWS_SIGNING_CERTIFICATE: "certificate.pfx",
      WORKBENCH_STORE_MANIFEST_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
      WORKBENCH_RELEASE_BASE_URL: "https://releases.matriz.dev/workbench/",
    })).not.toThrow()
  })

  it("writes a stable manifest from the generated setup executable", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "matriz-workbench-release-"))
    temporaryDirectories.push(directory)
    const setupPath = path.join(directory, "matriz-workbench-0.1.0-windows-x64-setup.exe")
    const manifestPath = path.join(directory, "release-manifest.json")
    await writeFile(setupPath, "setup-binary")

    const { privateKey } = generateKeyPairSync("ed25519")
    await writeWorkbenchReleaseManifest({ version: "0.1.0", setupPath, manifestPath,
      signaturePath: `${manifestPath}.sig`, downloadBaseUrl: "https://releases.matriz.dev/",
      releasedAt: "2026-08-27T12:00:00.000Z", minimumControlVersion: "0.1.0",
      privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString() })
    const manifestBytes = await readFile(manifestPath)
    expect(JSON.parse(manifestBytes.toString())).toMatchObject({ schemaVersion: "v1", appId: "matriz-workbench" })
    await expect(readFile(`${manifestPath}.sig`, "utf8")).resolves.toMatch(/^[A-Za-z0-9+/]+=*\n$/)
  })
})
