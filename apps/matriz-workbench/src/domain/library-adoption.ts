import { z } from "zod"

const sourceIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/)
const packageNameSchema = z.string().regex(/^@[a-z0-9-]+\/[a-z0-9-]+$/)
const subpathSchema = z.string().refine(
  (value) => value === "." || /^\.\/[a-z0-9][a-z0-9-]*(\/[a-z0-9-]+)*$/.test(value),
)
const evidenceSchema = z.string().refine(
  (value) =>
    value.length <= 300 &&
    !value.includes("\\") &&
    !value.startsWith("/") &&
    !/^[A-Za-z]:/.test(value) &&
    !value.includes("..") &&
    value.endsWith(".md"),
)

export const packageAdoptionRuleSchema = z.object({
  name: packageNameSchema,
  status: z.enum(["blocked", "candidate", "approved"]),
  allowedSubpaths: z.array(subpathSchema).max(50),
  requiredChecks: z.array(z.string().regex(/^[a-z0-9][a-z0-9:-]*$/)).max(30),
  blockers: z.array(z.string().trim().min(1).max(240)).max(30),
  evidence: z.array(evidenceSchema).max(30),
}).strict()

export const libraryAdoptionPolicySchema = z.object({
  schemaVersion: z.literal(1),
  sourceId: sourceIdSchema,
  distribution: z.object({
    channel: z.literal("github_packages"),
    registry: z.literal("https://npm.pkg.github.com"),
    coordinatedReleases: z.boolean(),
  }).strict(),
  packages: z.array(packageAdoptionRuleSchema).max(100),
}).strict()

export type LibraryAdoptionPolicy = z.infer<typeof libraryAdoptionPolicySchema>
export type PackageAdoptionRule = z.infer<typeof packageAdoptionRuleSchema>

export interface PackageAdoptionReadiness {
  sourceId: string
  packageName: string
  status: "not_configured" | PackageAdoptionRule["status"]
  ready: boolean
  satisfied: string[]
  missing: string[]
  blockers: string[]
  allowedSubpaths: string[]
  evidence: string[]
}
