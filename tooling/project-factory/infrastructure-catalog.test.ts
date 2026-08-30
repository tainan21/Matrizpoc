import path from "node:path"
import { describe, expect, it } from "vitest"
import { loadInfrastructureCatalog, validateInfrastructureBaseline } from "./infrastructure-catalog"

describe("Infrastructure Contract repository catalog", () => {
  it("loads every manifested app and the eight exclusive database schemas", async () => {
    const catalog = await loadInfrastructureCatalog(path.resolve("."))

    expect(catalog.issues).toEqual([])
    expect(catalog.contracts).toHaveLength(16)
    expect(catalog.contracts.flatMap((contract) => contract.database.schema ?? [])).toEqual([
      "contracts",
      "hub",
      "core",
      "ops",
      "pay",
      "seumei",
      "spot",
      "willdash",
    ])
    expect(validateInfrastructureBaseline(catalog.contracts)).toEqual([])
  })

  it("rejects a schema claimed by the wrong app", async () => {
    const catalog = await loadInfrastructureCatalog(path.resolve("."))
    const changed = catalog.contracts.map((contract) => contract.appId === "spot"
      ? { ...contract, database: { ...contract.database, schema: "pay" as const, runtimeRole: "matriz_pay_runtime", migrationRole: "matriz_pay_migration", prismaSchema: "prisma/pay/schema.prisma" } }
      : contract)

    expect(validateInfrastructureBaseline(changed)).toContain('Schema "spot" must be owned by "spot".')
  })

  it("keeps event names out of the infrastructure contract", async () => {
    const catalog = await loadInfrastructureCatalog(path.resolve("."))
    const serialized = JSON.stringify(catalog.contracts)

    expect(serialized).not.toContain("wallet.created")
    expect(serialized).not.toContain("contract.created")
  })
})
