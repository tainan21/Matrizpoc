import { createHash, createPrivateKey, randomUUID, sign } from "node:crypto"
import { readFile, stat, writeFile } from "node:fs/promises"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export interface ReleaseArtifact {
  productId: string
  version: string
  filePath: string
  downloadUrl: string
  updater?: {
    signaturePath: string
    downloadUrl: string
  }
}

export function canonicalReleasePayload(input: {
  productId: string
  version: string
  downloadUrl: string
  sizeBytes: number
  sha256: string
}) {
  return `${input.productId}\n${input.version}\n${input.downloadUrl}\n${input.sizeBytes}\n${input.sha256}`
}

export async function publishDistributionRelease(
  artifact: ReleaseArtifact,
  environment: NodeJS.ProcessEnv = process.env,
  request: typeof fetch = fetch,
) {
  const hubUrl = required(environment, "MATRIZ_DISTRIBUTION_HUB_URL")
  const token = required(environment, "MATRIZ_DISTRIBUTION_ADMIN_TOKEN")
  const privateKey = required(environment, "MATRIZ_DISTRIBUTION_MANIFEST_PRIVATE_KEY")
  const url = new URL(artifact.downloadUrl)
  if (url.protocol !== "https:") throw new Error("Release download URL must use HTTPS")
  if (!/^\d+\.\d+\.\d+$/.test(artifact.version)) throw new Error("Stable version must be a plain semver")

  const filePath = resolve(artifact.filePath)
  const info = await stat(filePath)
  if (!info.isFile() || info.size < 1 || info.size > 536_870_912) throw new Error("Installer size is invalid")
  const bytes = await readFile(filePath)
  const sha256 = createHash("sha256").update(bytes).digest("hex")
  const canonical = canonicalReleasePayload({ ...artifact, sizeBytes: info.size, sha256 })
  const signature = sign(null, Buffer.from(canonical), createPrivateKey(privateKey)).toString("base64")
  const updater = artifact.updater ? await updaterMetadata(artifact.updater, info.size) : undefined
  const body = {
    version: artifact.version,
    channel: "stable",
    releasedAt: new Date().toISOString(),
    releaseNotes: null,
    installer: { fileName: basename(filePath), downloadUrl: artifact.downloadUrl, sizeBytes: info.size, sha256 },
    signature,
    ...(updater ? { updater: { "windows-x86_64": updater } } : {}),
  }
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" }
  const createResponse = await request(
    new URL(`/api/v1/distribution/admin/products/${encodeURIComponent(artifact.productId)}/releases`, hubUrl),
    { method: "POST", headers: { ...headers, "idempotency-key": `release-${artifact.productId}-${artifact.version}` }, body: JSON.stringify(body) },
  )
  const draft = await responseJson(createResponse)
  if (typeof draft.releaseId !== "string") throw new Error("Hub did not return a releaseId")
  const publishResponse = await request(
    new URL(`/api/v1/distribution/admin/releases/${encodeURIComponent(draft.releaseId)}/publish`, hubUrl),
    { method: "POST", headers: { ...headers, "idempotency-key": `publish-${artifact.productId}-${artifact.version}` }, body: "{}" },
  )
  await responseJson(publishResponse)
  await writeFile(`${filePath}.distribution.json`, `${JSON.stringify({ ...body, productId: artifact.productId }, null, 2)}\n`)
  return { releaseId: draft.releaseId, sha256, signature }
}

async function updaterMetadata(
  updater: NonNullable<ReleaseArtifact["updater"]>,
  sizeBytes: number,
) {
  const url = new URL(updater.downloadUrl)
  if (url.protocol !== "https:") throw new Error("Updater download URL must use HTTPS")
  const signature = (await readFile(resolve(updater.signaturePath), "utf8")).trim()
  if (signature.length < 16 || signature.length > 16_384) {
    throw new Error("Updater signature is invalid")
  }
  return { url: url.toString(), signature, sizeBytes }
}

function required(environment: NodeJS.ProcessEnv, name: string) {
  const value = environment[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : `Hub request failed (${response.status})`)
  return body
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [productId, version, filePath, downloadUrl, updaterSignaturePath, updaterDownloadUrl] = process.argv.slice(2)
  if (!productId || !version || !filePath || !downloadUrl) throw new Error("Usage: publish-distribution-release <productId> <version> <file> <https-url>")
  if ((updaterSignaturePath && !updaterDownloadUrl) || (!updaterSignaturePath && updaterDownloadUrl)) {
    throw new Error("Updater signature path and download URL must be provided together")
  }
  publishDistributionRelease({
    productId,
    version,
    filePath,
    downloadUrl,
    ...(updaterSignaturePath && updaterDownloadUrl
      ? { updater: { signaturePath: updaterSignaturePath, downloadUrl: updaterDownloadUrl } }
      : {}),
  })
    .then(({ releaseId }) => console.log(`Published ${productId} ${version} as ${releaseId}`))
    .catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
}
