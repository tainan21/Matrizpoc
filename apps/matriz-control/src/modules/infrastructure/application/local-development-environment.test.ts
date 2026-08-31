import { describe, expect, it } from "vitest"
import type { InfrastructureContractV1 } from "@matriz/integration-infrastructure-contracts"
import { resolveDeclaredEnvironment } from "./local-development-environment"

const contract: InfrastructureContractV1 = {
  schemaVersion: "v1",
  appId: "matriz-identity",
  classification: "platform",
  runtime: { kind: "service", port: 8080, healthPath: "/healthz" },
  database: { required: true, schema: "core", tenancy: "mixed", runtimeRole: "matriz_core_runtime", migrationRole: "matriz_core_migration", workerRole: "matriz_core_worker", prismaSchema: "prisma/core/schema.prisma" },
  identity: { required: false },
  cache: { required: false, namespaces: [] },
  events: { transport: "nats-jetstream", outbox: true, inbox: true },
  environment: { keys: [
    { name: "IDENTITY_ISSUER", secret: false, required: true, source: "generated" },
    { name: "IDENTITY_CSRF_SECRET", secret: true, required: true, source: "control-vault" },
    { name: "OPTIONAL_VALUE", secret: false, required: false, source: "operator" },
  ] },
  filesystem: { required: false },
}

describe("local development environment", () => {
  it("returns only values declared by the contract and identifies redactions", () => {
    expect(resolveDeclaredEnvironment(contract, {
      IDENTITY_ISSUER: "http://127.0.0.1:8080",
      IDENTITY_CSRF_SECRET: "s".repeat(32),
      UNDECLARED_SECRET: "must-not-leak",
    })).toEqual({
      values: { IDENTITY_ISSUER: "http://127.0.0.1:8080", IDENTITY_CSRF_SECRET: "s".repeat(32) },
      redactions: ["s".repeat(32)],
    })
  })

  it("fails closed when a required value is missing or blank", () => {
    expect(() => resolveDeclaredEnvironment(contract, { IDENTITY_ISSUER: "http://127.0.0.1:8080" })).toThrow(/IDENTITY_CSRF_SECRET/)
    expect(() => resolveDeclaredEnvironment(contract, { IDENTITY_ISSUER: " ", IDENTITY_CSRF_SECRET: "s".repeat(32) })).toThrow(/IDENTITY_ISSUER/)
  })

  it("rejects control-plane credentials even when a malformed contract declares them", () => {
    const malformed = { ...contract, environment: { keys: [...contract.environment.keys, { name: "MATRIZ_CONTROL_LOCAL_TOKEN", secret: true, required: true, source: "control-vault" as const }] } }
    expect(() => resolveDeclaredEnvironment(malformed, { IDENTITY_ISSUER: "http://127.0.0.1:8080", IDENTITY_CSRF_SECRET: "s".repeat(32), MATRIZ_CONTROL_LOCAL_TOKEN: "x".repeat(32) })).toThrow(/control-plane/i)
  })
})
