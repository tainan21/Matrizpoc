import { z } from "zod"

const semver = z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/)
const productId = z.string().regex(/^[a-z0-9][a-z0-9-]{2,63}$/)
const safeRegistryKey = z.string().min(1).max(180).regex(/^[A-Za-z0-9 ._{}-]+$/)
const safeFileName = z.string().min(1).max(180).regex(/^[A-Za-z0-9][A-Za-z0-9 ._()-]+\.exe$/i)

export const distributionWindowsIdentityV1Schema = z.object({
  uninstallKey: safeRegistryKey,
  displayName: z.string().min(1).max(120),
  publisher: z.string().min(1).max(120),
  executableName: safeFileName,
  aliases: z.array(z.string().min(1).max(120)).max(12).default([]),
})

export const distributionProductInputV1Schema = z.object({
  productId,
  displayName: z.string().min(1).max(120),
  edition: z.string().min(1).max(80),
  runtime: z.enum(["tauri", "electron", "native", "web"]),
  platform: z.literal("win32"),
  arch: z.literal("x64"),
  windows: distributionWindowsIdentityV1Schema,
})

export const distributionInstallerV1Schema = z.object({
  fileName: z.string().min(1).max(180).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.exe$/i),
  downloadUrl: z.string().url().refine((value) => new URL(value).protocol === "https:", "Stable installers require HTTPS"),
  sizeBytes: z.number().int().positive().max(536_870_912),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
})

export const distributionReleaseInputV1Schema = z.object({
  version: semver,
  channel: z.enum(["stable", "beta"]),
  releasedAt: z.string().datetime(),
  releaseNotes: z.string().max(8_000).nullable(),
  installer: distributionInstallerV1Schema,
  signature: z.string().min(16).max(16_384),
})

export const distributionReleaseV1Schema = distributionReleaseInputV1Schema.extend({
  releaseId: z.string().uuid(),
  status: z.enum(["draft", "published", "retired"]),
  publishedAt: z.string().datetime().nullable(),
})

export const distributionProductV1Schema = distributionProductInputV1Schema.extend({
  state: z.enum(["active", "unavailable", "retired"]),
  release: distributionReleaseV1Schema.nullable(),
})

export const distributionCatalogV1Schema = z.object({
  schemaVersion: z.literal("v1"),
  generatedAt: z.string().datetime(),
  products: z.array(distributionProductV1Schema),
})

export type DistributionProductInputV1 = z.infer<typeof distributionProductInputV1Schema>
export type DistributionReleaseInputV1 = z.infer<typeof distributionReleaseInputV1Schema>
export type DistributionProductV1 = z.infer<typeof distributionProductV1Schema>
export type DistributionCatalogV1 = z.infer<typeof distributionCatalogV1Schema>

