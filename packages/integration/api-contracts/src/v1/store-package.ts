import { z } from "zod"

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "Expected a semantic version")
const windowsInstallerNameSchema = z
  .string()
  .min(1)
  .max(180)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*-setup\.exe$/i, "Expected a safe NSIS installer filename")

export const storePackageManifestV1Schema = z.object({
  schemaVersion: z.literal("v1"),
  appId: z.enum(["matriz-workbench", "seumei"]),
  version: semverSchema,
  channel: z.literal("stable"),
  platform: z.literal("win32"),
  arch: z.literal("x64"),
  releasedAt: z.string().datetime(),
  minimumControlVersion: semverSchema,
  releaseNotes: z.string().max(8_000).nullable(),
  installer: z.object({
    fileName: windowsInstallerNameSchema,
    downloadUrl: z.string().url().startsWith("https://"),
    sizeBytes: z.number().int().positive().max(536_870_912),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
}).superRefine((manifest, context) => {
  const expectedFileName = `${manifest.appId}-${manifest.version}-windows-x64-setup.exe`
  if (manifest.installer.fileName !== expectedFileName) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["installer", "fileName"],
      message: `installer.fileName must be ${expectedFileName}`,
    })
  }
})

export type StorePackageManifestV1 = z.infer<typeof storePackageManifestV1Schema>
