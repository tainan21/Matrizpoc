import { createHash } from "node:crypto"
import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { storePackageManifestV1Schema } from "@matriz/integration-api-contracts"
import { createReleaseManifest, serializeReleaseManifest, signReleaseManifest } from "../desktop/release-manifest"

export type ReleaseManifestOptions = { version: string; installerPath: string; outputPath: string; downloadUrl: string; releasedAt: string; minimumControlVersion: string; releaseNotes: string | null; signingPrivateKeyPem: string }

export async function writeDesktopReleaseManifest(options: ReleaseManifestOptions): Promise<void> {
  const bytes = await readFile(options.installerPath)
  const file = await stat(options.installerPath)
  const manifest = storePackageManifestV1Schema.parse(createReleaseManifest({ version: options.version, releasedAt: options.releasedAt, minimumControlVersion: options.minimumControlVersion, releaseNotes: options.releaseNotes, downloadUrl: options.downloadUrl, sizeBytes: file.size, sha256: createHash("sha256").update(bytes).digest("hex") }))
  const payload = serializeReleaseManifest(manifest)
  await mkdir(dirname(options.outputPath), { recursive: true })
  await writeFile(options.outputPath, payload, "utf8")
  await writeFile(`${options.outputPath}.sig`, `${signReleaseManifest(payload, options.signingPrivateKeyPem)}\n`, "utf8")
}

async function main(): Promise<void> {
  const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8")) as { version?: string }
  if (!packageJson.version) throw new Error("package.json must declare a version")
  const privateKeyPath = process.env.SEUMEI_STORE_MANIFEST_PRIVATE_KEY?.trim()
  const downloadUrl = process.env.SEUMEI_DESKTOP_INSTALLER_URL?.trim()
  const releasedAt = process.env.SEUMEI_DESKTOP_RELEASED_AT?.trim()
  if (!privateKeyPath) throw new Error("SEUMEI_STORE_MANIFEST_PRIVATE_KEY is required")
  if (!downloadUrl) throw new Error("SEUMEI_DESKTOP_INSTALLER_URL is required")
  if (!releasedAt) throw new Error("SEUMEI_DESKTOP_RELEASED_AT is required for a reproducible manifest")
  const artifact = `seumei-${packageJson.version}-windows-x64-setup.exe`
  await writeDesktopReleaseManifest({ version: packageJson.version, installerPath: resolve("desktop-release", artifact), outputPath: resolve("desktop-release/release-manifest.json"), downloadUrl, releasedAt, minimumControlVersion: process.env.SEUMEI_MINIMUM_CONTROL_VERSION?.trim() || "0.1.0", releaseNotes: process.env.SEUMEI_DESKTOP_RELEASE_NOTES?.trim() || null, signingPrivateKeyPem: await readFile(resolve(privateKeyPath), "utf8") })
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
