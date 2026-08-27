import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto"
import type { StorePackageManifestV1 } from "@matriz/integration-api-contracts"

export type ReleaseManifestInput = { version: string; releasedAt: string; minimumControlVersion: string; releaseNotes: string | null; downloadUrl: string; sizeBytes: number; sha256: string }
type Environment = Readonly<Record<string, string | undefined>>

export function createReleaseManifest(input: ReleaseManifestInput): StorePackageManifestV1 {
  return { schemaVersion: "v1", appId: "seumei", version: input.version, channel: "stable", platform: "win32", arch: "x64", releasedAt: input.releasedAt, minimumControlVersion: input.minimumControlVersion, releaseNotes: input.releaseNotes, installer: { fileName: `seumei-${input.version}-windows-x64-setup.exe`, downloadUrl: input.downloadUrl, sizeBytes: input.sizeBytes, sha256: input.sha256 } }
}
export function serializeReleaseManifest(manifest: StorePackageManifestV1): string { return `${JSON.stringify(manifest, null, 2)}\n` }
export function signReleaseManifest(payload: string, privateKeyPem: string): string { return sign(null, Buffer.from(payload), createPrivateKey(privateKeyPem)).toString("base64") }
export function verifyReleaseManifestSignature(payload: string, signature: string, publicKeyPem: string): boolean { return verify(null, Buffer.from(payload), createPublicKey(publicKeyPem), Buffer.from(signature, "base64")) }
export function assertSigningConfiguration(environment: Environment): string { const certificate = environment.CSC_LINK?.trim(); if (!certificate) throw new Error("CSC_LINK is required for a signed Windows release"); return certificate }
