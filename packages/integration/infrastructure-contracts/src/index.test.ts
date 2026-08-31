import { describe, expect, it } from "vitest"
import { readFile } from "node:fs/promises"
import path from "node:path"
import {
  infrastructureContractV1Schema,
  validateInfrastructureCatalog,
  type InfrastructureContractV1,
} from "./index"

const validTenantApp = {
  schemaVersion: "v1",
  appId: "seumei",
  classification: "product",
  runtime: { kind: "web", port: 3002, healthPath: "/api/health" },
  database: {
    required: true,
    schema: "seumei",
    tenancy: "tenant",
    runtimeRole: "matriz_seumei_runtime",
    migrationRole: "matriz_seumei_migration",
    workerRole: "matriz_seumei_worker",
    prismaSchema: "prisma/seumei/schema.prisma",
  },
  identity: { required: true, oidcClientId: "seumei", callbackPath: "/api/auth/oidc/callback" },
  cache: { required: true, namespaces: ["catalog", "sessions"], defaultTtlSeconds: 300 },
  events: { transport: "nats-jetstream", outbox: true, inbox: true },
  environment: {
    keys: [
      { name: "DATABASE_URL", secret: true, required: true, source: "control-vault" },
      { name: "NODE_ENV", secret: false, required: true, source: "operator" },
    ],
  },
  filesystem: { required: false },
} satisfies InfrastructureContractV1

describe("InfrastructureContractV1", () => {
  it("publishes a versioned JSON Schema for non-TypeScript consumers", async () => {
    const jsonSchema = JSON.parse(await readFile(path.resolve("schema/infrastructure-contract-v1.schema.json"), "utf8"))

    expect(jsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://matriz.dev/schemas/infrastructure-contract-v1.schema.json",
      additionalProperties: false,
    })
    expect(jsonSchema.properties.database.properties.schema.enum).toEqual([
      "core", "hub", "spot", "seumei", "contracts", "willdash", "ops", "pay",
    ])
    expect(jsonSchema.properties.database.properties.workerRole.pattern).toBe(
      "^matriz_(core|hub|spot|seumei|contracts|willdash|ops|pay)_worker$",
    )
  })

  it("accepts a complete tenant-owned app declaration", () => {
    expect(infrastructureContractV1Schema.parse(validTenantApp)).toEqual(validTenantApp)
  })

  it.each([
    ["wrong runtime role", { database: { ...validTenantApp.database, runtimeRole: "postgres" } }],
    ["wrong migration role", { database: { ...validTenantApp.database, migrationRole: "matriz_core_migration" } }],
    ["wrong worker role", { database: { ...validTenantApp.database, workerRole: "matriz_core_worker" } }],
    ["absolute prisma path", { database: { ...validTenantApp.database, prismaSchema: "C:/data/schema.prisma" } }],
    ["missing TTL", { cache: { required: true, namespaces: ["catalog"] } }],
    ["secret value", { environment: { keys: [{ name: "TOKEN", secret: true, required: true, source: "operator", value: "leak" }] } }],
  ])("rejects %s", (_name, override) => {
    const candidate = { ...validTenantApp, ...override }
    expect(infrastructureContractV1Schema.safeParse(candidate).success).toBe(false)
  })

  it("rejects database attributes when database is not required", () => {
    const candidate = {
      ...validTenantApp,
      database: { required: false, tenancy: "none", schema: "seumei" },
    }
    expect(infrastructureContractV1Schema.safeParse(candidate).success).toBe(false)
  })

  it("requires a worker role exactly when a database-backed app owns an outbox or inbox", () => {
    const withoutWorker = {
      ...validTenantApp,
      database: { ...validTenantApp.database, workerRole: undefined },
    }
    const withoutEvents = {
      ...validTenantApp,
      database: { ...validTenantApp.database },
      events: { transport: "none", outbox: false, inbox: false },
    }

    expect(infrastructureContractV1Schema.safeParse(withoutWorker).success).toBe(false)
    expect(infrastructureContractV1Schema.safeParse(withoutEvents).success).toBe(false)
  })

  it("allows a database-less consumer to use only NATS credentials", () => {
    const consumer = {
      ...validTenantApp,
      appId: "matriz-admin",
      database: { required: false, tenancy: "none" },
      events: { transport: "nats-jetstream", outbox: false, inbox: true },
    }

    expect(infrastructureContractV1Schema.safeParse(consumer).success).toBe(true)
  })

  it("rejects duplicate environment keys and unsafe filesystem roots", () => {
    const candidate = {
      ...validTenantApp,
      environment: { keys: [validTenantApp.environment.keys[0], validTenantApp.environment.keys[0]] },
      filesystem: { required: true, roots: ["C:/Users/example"] },
    }
    expect(infrastructureContractV1Schema.safeParse(candidate).success).toBe(false)
  })
})

describe("infrastructure catalog", () => {
  it("detects duplicated app ids, schemas and runtime ports", () => {
    const duplicate = { ...validTenantApp, appId: "spot" as const }
    const result = validateInfrastructureCatalog([validTenantApp, duplicate])

    expect(result.success).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "duplicate-schema",
      "duplicate-port",
    ]))
  })

  it("accepts independent app declarations", () => {
    const tooling = infrastructureContractV1Schema.parse({
      schemaVersion: "v1",
      appId: "matriz-control",
      classification: "tooling",
      runtime: { kind: "desktop" },
      database: { required: false, tenancy: "none" },
      identity: { required: false },
      cache: { required: false, namespaces: [] },
      events: { transport: "none", outbox: false, inbox: false },
      environment: { keys: [] },
      filesystem: { required: false },
    })

    expect(validateInfrastructureCatalog([validTenantApp, tooling])).toEqual({ success: true, issues: [] })
  })
})
