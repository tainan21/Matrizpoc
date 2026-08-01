import { z } from "zod"

const sourceId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/)
const relativeDocumentPattern = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.startsWith("\\") &&
      !value.includes("..") &&
      !value.includes("\\") &&
      (value.endsWith(".md") || value.endsWith("/**/*.md")),
    "Document include must be a safe Markdown path or subtree.",
  )

export const projectKindSchema = z.enum([
  "application",
  "library",
  "site_collection",
  "tooling",
  "external_repository",
])

export const federatedSourceDefinitionSchema = z.object({
  id: sourceId,
  name: z.string().trim().min(1).max(120),
  kind: projectKindSchema,
  gitRemote: z.string().url().optional(),
  documentationIncludes: z
    .array(relativeDocumentPattern)
    .min(1)
    .max(20)
    .default(["README.md", "AGENTS.md", "docs/**/*.md"]),
})

export const federatedSourceRegistrySchema = z.object({
  schemaVersion: z.literal(1),
  sources: z.array(federatedSourceDefinitionSchema).max(100),
})

export const localSourceBindingSchema = z.object({
  sourceId,
  absolutePath: z.string().trim().min(3).max(500),
  enabled: z.boolean().default(true),
  access: z.literal("read_only"),
})

export const localSourceBindingsSchema = z.object({
  schemaVersion: z.literal(1),
  bindings: z.array(localSourceBindingSchema).max(100),
})

export const repositoryDocumentStatusSchema = z.enum([
  "canonical",
  "reference",
  "historical",
  "unknown",
])

export interface RegisteredSource
  extends z.infer<typeof federatedSourceDefinitionSchema> {
  absolutePath?: string
  available: boolean
  access: "read_only"
}

export interface RepositoryDocumentSummary {
  sourceId: string
  path: string
  title: string
  category: string
  status: z.infer<typeof repositoryDocumentStatusSchema>
  editable: false
  bytes: number
  hash: string
}

export interface RepositoryDocument extends RepositoryDocumentSummary {
  content: string
}

export interface RegisteredSourceSummary {
  sourceId: string
  packageName?: string
  version?: string
  scripts: string[]
  packages: Array<{ name: string; version?: string }>
}

export interface RegisteredPackageSummary {
  sourceId: string
  name: string
  version?: string
  exports: string[]
  dependencies: string[]
  peerDependencies: string[]
  scripts: string[]
}

export type ProjectKind = z.infer<typeof projectKindSchema>
export type FederatedSourceDefinition = z.infer<
  typeof federatedSourceDefinitionSchema
>
