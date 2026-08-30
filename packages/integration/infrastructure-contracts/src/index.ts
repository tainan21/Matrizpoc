import { z } from "@matriz/foundation-schemas"

export const infrastructureSchemaNameSchema = z.enum([
  "core",
  "hub",
  "spot",
  "seumei",
  "contracts",
  "willdash",
  "ops",
  "pay",
])

const relativePathSchema = z.string().min(1).refine(
  (value) => !value.startsWith("/") && !value.startsWith("\\") && !/^[A-Za-z]:[\\/]/.test(value) && !value.split(/[\\/]/).includes(".."),
  "Path must be repository-relative and cannot traverse parents.",
)

const routePathSchema = z.string().regex(/^\/(?!\/)[^?#]*$/, "Must be an absolute application path without query or fragment.")
const environmentNameSchema = z.string().regex(/^[A-Z][A-Z0-9_]*$/)
const namespaceSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/)

const runtimeSchema = z.object({
  kind: z.enum(["web", "service", "desktop", "library"]),
  port: z.number().int().min(1024).max(65535).optional(),
  healthPath: routePathSchema.optional(),
}).strict().superRefine((runtime, context) => {
  if ((runtime.kind === "desktop" || runtime.kind === "library") && runtime.port !== undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["port"], message: `${runtime.kind} runtimes cannot reserve a server port.` })
  }
  if (runtime.kind === "library" && runtime.healthPath !== undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["healthPath"], message: "Library runtimes cannot expose a health path." })
  }
})

const databaseSchema = z.object({
  required: z.boolean(),
  schema: infrastructureSchemaNameSchema.optional(),
  tenancy: z.enum(["tenant", "mixed", "global-user", "operator-global", "none"]),
  runtimeRole: z.string().optional(),
  migrationRole: z.string().optional(),
  prismaSchema: relativePathSchema.optional(),
}).strict().superRefine((database, context) => {
  const operationalKeys = ["schema", "runtimeRole", "migrationRole", "prismaSchema"] as const
  if (!database.required) {
    if (database.tenancy !== "none") {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["tenancy"], message: "Apps without a database must use tenancy none." })
    }
    for (const key of operationalKeys) {
      if (database[key] !== undefined) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `Apps without a database cannot declare ${key}.` })
      }
    }
    return
  }

  if (!database.schema) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["schema"], message: "Database schema is required." })
    return
  }
  if (database.tenancy === "none") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["tenancy"], message: "Database-backed apps must declare their tenancy model." })
  }
  const expectedRuntimeRole = `matriz_${database.schema}_runtime`
  const expectedMigrationRole = `matriz_${database.schema}_migration`
  const expectedPrismaSchema = `prisma/${database.schema}/schema.prisma`
  if (database.runtimeRole !== expectedRuntimeRole) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["runtimeRole"], message: `Expected ${expectedRuntimeRole}.` })
  }
  if (database.migrationRole !== expectedMigrationRole) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["migrationRole"], message: `Expected ${expectedMigrationRole}.` })
  }
  if (database.prismaSchema !== expectedPrismaSchema) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["prismaSchema"], message: `Expected ${expectedPrismaSchema}.` })
  }
})

const identitySchema = z.object({
  required: z.boolean(),
  oidcClientId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).optional(),
  callbackPath: routePathSchema.optional(),
}).strict().superRefine((identity, context) => {
  if (identity.required && (!identity.oidcClientId || !identity.callbackPath)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "OIDC client id and callback path are required when identity is required." })
  }
  if (!identity.required && (identity.oidcClientId !== undefined || identity.callbackPath !== undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Identity-disabled apps cannot declare OIDC settings." })
  }
})

const cacheSchema = z.object({
  required: z.boolean(),
  namespaces: z.array(namespaceSchema),
  defaultTtlSeconds: z.number().int().positive().max(2_592_000).optional(),
}).strict().superRefine((cache, context) => {
  if (new Set(cache.namespaces).size !== cache.namespaces.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["namespaces"], message: "Cache namespaces must be unique." })
  }
  if ((cache.required || cache.namespaces.length > 0) && cache.defaultTtlSeconds === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["defaultTtlSeconds"], message: "Every declared cache requires a default TTL." })
  }
})

const eventsSchema = z.object({
  transport: z.enum(["nats-jetstream", "none"]),
  outbox: z.boolean(),
  inbox: z.boolean(),
}).strict().superRefine((events, context) => {
  if (events.transport === "none" && (events.outbox || events.inbox)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Outbox and inbox require the NATS JetStream transport." })
  }
})

const environmentKeySchema = z.object({
  name: environmentNameSchema,
  secret: z.boolean(),
  required: z.boolean(),
  source: z.enum(["generated", "control-vault", "operator"]),
}).strict()

const environmentSchema = z.object({ keys: z.array(environmentKeySchema) }).strict().superRefine((environment, context) => {
  const names = environment.keys.map((entry) => entry.name)
  if (new Set(names).size !== names.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["keys"], message: "Environment key names must be unique." })
  }
})

const filesystemSchema = z.object({
  required: z.boolean(),
  roots: z.array(relativePathSchema).optional(),
}).strict().superRefine((filesystem, context) => {
  if (filesystem.required && (!filesystem.roots || filesystem.roots.length === 0)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["roots"], message: "Filesystem roots are required." })
  }
  if (!filesystem.required && filesystem.roots !== undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["roots"], message: "Filesystem-disabled apps cannot declare roots." })
  }
})

export const infrastructureContractV1Schema = z.object({
  schemaVersion: z.literal("v1"),
  appId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  classification: z.enum(["product", "platform", "tooling", "library", "site"]),
  runtime: runtimeSchema,
  database: databaseSchema,
  identity: identitySchema,
  cache: cacheSchema,
  events: eventsSchema,
  environment: environmentSchema,
  filesystem: filesystemSchema,
}).strict()

export type InfrastructureContractV1 = z.infer<typeof infrastructureContractV1Schema>
export type InfrastructureSchemaName = z.infer<typeof infrastructureSchemaNameSchema>

export type InfrastructureCatalogIssueCode = "invalid-contract" | "duplicate-app-id" | "duplicate-schema" | "duplicate-port"

export interface InfrastructureCatalogIssue {
  readonly code: InfrastructureCatalogIssueCode
  readonly message: string
  readonly appIds: readonly string[]
}

export interface InfrastructureCatalogValidation {
  readonly success: boolean
  readonly issues: readonly InfrastructureCatalogIssue[]
}

export function validateInfrastructureCatalog(values: readonly unknown[]): InfrastructureCatalogValidation {
  const issues: InfrastructureCatalogIssue[] = []
  const contracts: InfrastructureContractV1[] = []
  for (const [index, value] of values.entries()) {
    const parsed = infrastructureContractV1Schema.safeParse(value)
    if (!parsed.success) {
      issues.push({ code: "invalid-contract", message: `Contract at index ${index} is invalid.`, appIds: [] })
    } else {
      contracts.push(parsed.data)
    }
  }

  const findDuplicates = <T extends string | number>(
    select: (contract: InfrastructureContractV1) => T | undefined,
    code: Exclude<InfrastructureCatalogIssueCode, "invalid-contract">,
    label: string,
  ) => {
    const grouped = new Map<T, string[]>()
    for (const contract of contracts) {
      const value = select(contract)
      if (value === undefined) continue
      grouped.set(value, [...(grouped.get(value) ?? []), contract.appId])
    }
    for (const [value, appIds] of grouped) {
      if (appIds.length > 1) issues.push({ code, message: `${label} ${String(value)} is declared more than once.`, appIds })
    }
  }

  findDuplicates((contract) => contract.appId, "duplicate-app-id", "App id")
  findDuplicates((contract) => contract.database.schema, "duplicate-schema", "Database schema")
  findDuplicates((contract) => contract.runtime.port, "duplicate-port", "Runtime port")

  return { success: issues.length === 0, issues }
}
