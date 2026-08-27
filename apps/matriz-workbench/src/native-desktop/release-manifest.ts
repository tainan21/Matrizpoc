import { createHash, createPrivateKey, sign } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { storePackageManifestV1Schema, type StorePackageManifestV1 } from "@matriz/integration-api-contracts"

export interface WorkbenchReleaseManifestInput {
  version: string; sha256: string; size: number; downloadUrl: string; releasedAt: string
  minimumControlVersion: string; releaseNotes?: string | null
}
export interface WorkbenchReleaseSigningEnvironment {
  WORKBENCH_WINDOWS_SIGNING_CERTIFICATE?: string
  WORKBENCH_STORE_MANIFEST_PRIVATE_KEY?: string
  WORKBENCH_RELEASE_BASE_URL?: string
}

export function assertWorkbenchReleaseSigning(environment: WorkbenchReleaseSigningEnvironment = process.env as WorkbenchReleaseSigningEnvironment): void {
  if (!environment.WORKBENCH_WINDOWS_SIGNING_CERTIFICATE?.trim()) throw new Error("WORKBENCH_WINDOWS_SIGNING_CERTIFICATE ausente; uma release Windows exige certificado de assinatura.")
  if (!environment.WORKBENCH_STORE_MANIFEST_PRIVATE_KEY?.trim()) throw new Error("WORKBENCH_STORE_MANIFEST_PRIVATE_KEY ausente; o manifesto da Store exige assinatura Ed25519.")
  const key = createPrivateKey(environment.WORKBENCH_STORE_MANIFEST_PRIVATE_KEY)
  if (key.asymmetricKeyType !== "ed25519") throw new Error("WORKBENCH_STORE_MANIFEST_PRIVATE_KEY deve ser uma chave Ed25519.")
  if (!environment.WORKBENCH_RELEASE_BASE_URL?.startsWith("https://")) throw new Error("WORKBENCH_RELEASE_BASE_URL deve ser HTTPS.")
}

export function buildWorkbenchReleaseManifest(input: WorkbenchReleaseManifestInput): StorePackageManifestV1 {
  return storePackageManifestV1Schema.parse({
    schemaVersion: "v1", appId: "matriz-workbench", version: input.version, channel: "stable",
    platform: "win32", arch: "x64", releasedAt: input.releasedAt,
    minimumControlVersion: input.minimumControlVersion, releaseNotes: input.releaseNotes ?? null,
    installer: { fileName: `matriz-workbench-${input.version}-windows-x64-setup.exe`,
      downloadUrl: input.downloadUrl, sha256: input.sha256, sizeBytes: input.size },
  })
}

export function serializeStoreManifest(manifest: StorePackageManifestV1): Buffer {
  return Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8")
}

export function signStoreManifest(bytes: Buffer, privateKeyPem: string): string {
  const key = createPrivateKey(privateKeyPem)
  if (key.asymmetricKeyType !== "ed25519") throw new Error("A chave do manifesto deve ser Ed25519.")
  return sign(null, bytes, key).toString("base64")
}

export async function writeWorkbenchReleaseManifest(input: {
  version: string; setupPath: string; manifestPath: string; signaturePath: string
  downloadBaseUrl: string; releasedAt: string; minimumControlVersion: string; privateKeyPem: string
}): Promise<void> {
  const setup = await readFile(input.setupPath)
  const fileName = `matriz-workbench-${input.version}-windows-x64-setup.exe`
  const manifest = buildWorkbenchReleaseManifest({ version: input.version,
    sha256: createHash("sha256").update(setup).digest("hex"), size: setup.byteLength,
    downloadUrl: new URL(fileName, input.downloadBaseUrl).toString(), releasedAt: input.releasedAt,
    minimumControlVersion: input.minimumControlVersion })
  const bytes = serializeStoreManifest(manifest)
  await writeFile(input.manifestPath, bytes)
  await writeFile(input.signaturePath, `${signStoreManifest(bytes, input.privateKeyPem)}\n`, "utf8")
}
