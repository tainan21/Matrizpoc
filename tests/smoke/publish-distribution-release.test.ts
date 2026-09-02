import { generateKeyPairSync } from "node:crypto"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { canonicalReleasePayload, publishDistributionRelease } from "../../tooling/scripts/publish-distribution-release"

describe("distribution release publisher", () => {
  it("uses the documented canonical payload", () => {
    expect(canonicalReleasePayload({ productId: "matriz-control-tauri", version: "1.0.0", downloadUrl: "https://example.test/a.exe", sizeBytes: 3, sha256: "a".repeat(64) }))
      .toBe(`matriz-control-tauri\n1.0.0\nhttps://example.test/a.exe\n3\n${"a".repeat(64)}`)
  })

  it("fails closed without credentials", async () => {
    await expect(publishDistributionRelease({ productId: "matriz-control-tauri", version: "1.0.0", filePath: "missing.exe", downloadUrl: "https://example.test/a.exe" }, {})).rejects.toThrow("MATRIZ_DISTRIBUTION_HUB_URL")
  })

  it("creates and publishes a signed stable release", async () => {
    const directory = await mkdtemp(join(tmpdir(), "matriz-release-"))
    const filePath = join(directory, "matriz-control-1.0.0-windows-x64-setup.exe")
    const updaterSignaturePath = `${filePath}.sig`
    await writeFile(filePath, "installer")
    await writeFile(updaterSignaturePath, "trusted-tauri-signature")
    const { privateKey } = generateKeyPairSync("ed25519")
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json({ releaseId: "79d23079-1929-4f76-abba-becfbbf25fc6" }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ status: "published" }))
    await publishDistributionRelease(
      {
        productId: "matriz-control-tauri",
        version: "1.0.0",
        filePath,
        downloadUrl: "https://github.com/acme/repo/releases/download/control-v1.0.0/matriz-control-1.0.0-windows-x64-setup.exe",
        updater: {
          signaturePath: updaterSignaturePath,
          downloadUrl: "https://github.com/acme/repo/releases/download/control-v1.0.0/matriz-control-1.0.0-windows-x64-setup.exe",
        },
      },
      { MATRIZ_DISTRIBUTION_HUB_URL: "http://127.0.0.1:3000", MATRIZ_DISTRIBUTION_ADMIN_TOKEN: "token", MATRIZ_DISTRIBUTION_MANIFEST_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }).toString() },
      request,
    )
    expect(request).toHaveBeenCalledTimes(2)
    const body = JSON.parse(request.mock.calls[0][1].body)
    expect(body.channel).toBe("stable")
    expect(body.updater["windows-x86_64"]).toEqual({
      url: "https://github.com/acme/repo/releases/download/control-v1.0.0/matriz-control-1.0.0-windows-x64-setup.exe",
      signature: "trusted-tauri-signature",
      sizeBytes: 9,
    })
  })
})
