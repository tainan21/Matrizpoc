import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it, vi } from "vitest"

const root = process.cwd()

describe("repository ownership boundaries", () => {
  it("keeps product repositories out of the technical platform-db package", () => {
    for (const owner of ["hub", "seumei", "contracts"]) {
      const directory = path.join(root, "packages/platform/db/src/repositories", owner)
      expect(existsSync(directory) ? readdirSync(directory) : []).toEqual([])
    }
  })

  it.each([
    ["matriz-hub", "src/integration/prisma/repositories/index.ts"],
    ["seumei", "src/integration/prisma/repositories/index.ts"],
    ["contracts", "src/integration/prisma/repositories/index.ts"],
  ])("keeps %s repositories app-local", (app, repositoryEntry) => {
    expect(existsSync(path.join(root, "apps", app, repositoryEntry))).toBe(true)
  })

  it("does not preserve aliases or imports to deleted product repository paths", () => {
    const tsconfig = readFileSync(path.join(root, "tsconfig.base.json"), "utf8")
    const backendSmoke = readFileSync(path.join(root, "tests/smoke/v13-backend-real.test.ts"), "utf8")
    for (const owner of ["hub", "seumei", "contracts"]) {
      expect(tsconfig).not.toContain(`@matriz/platform-db/${owner}/repositories`)
      expect(backendSmoke).not.toContain(`platform/db/src/repositories/${owner}`)
    }
  })

  it("composes the Seumei entrypoint with the tenant on its aggregate root", async () => {
    const { makeEstablishmentRepo } = await import("../../apps/seumei/src/integration/prisma/repositories/index")
    const create = vi.fn().mockResolvedValue({ id: "est-1" })
    const repo = makeEstablishmentRepo({ establishment: { create } } as never)
    await repo.create({ tenantId: "tenant-a", name: "Casa A", slug: "casa-a", type: "RESTAURANT" as never, city: "Sao Paulo", profile: { displayName: "Casa A" } })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: "tenant-a", profile: { create: expect.not.objectContaining({ tenantId: expect.anything() }) } }) }))
  })

  it("composes the Contracts entrypoint with the tenant on its aggregate root", async () => {
    const { makeContractRepo } = await import("../../apps/contracts/src/integration/prisma/repositories/index")
    const create = vi.fn().mockResolvedValue({ id: "contract-1" })
    const repo = makeContractRepo({ contract: { create } } as never)
    await repo.create({ tenantId: "tenant-a", reference: "CTR-1", title: "Contrato", originApp: "seumei", originEntityType: "establishment", originEntityId: "est-1", parties: [{ role: "CLIENT" as never, displayName: "Casa A" }], initialBodyMarkdown: "# Contrato", initialVersionHash: "hash-1" })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: "tenant-a", parties: { create: [expect.not.objectContaining({ tenantId: expect.anything() })] }, versions: { create: expect.not.objectContaining({ tenantId: expect.anything() }) }, events: { create: expect.not.objectContaining({ tenantId: expect.anything() }) } }) }))
  })

  it("inherits nested tenant identity through composite Prisma relations", () => {
    const seumeiSchema = readFileSync(path.join(root, "prisma/seumei/schema.prisma"), "utf8")
    const contractsSchema = readFileSync(path.join(root, "prisma/contracts/schema.prisma"), "utf8")
    expect(seumeiSchema).toContain("@relation(fields: [tenantId, establishmentId], references: [tenantId, id]")
    expect(contractsSchema).toContain("@relation(fields: [tenantId, contractId], references: [tenantId, id]")
    expect(contractsSchema.match(/@relation\(fields: \[tenantId, contractId\], references: \[tenantId, id\]/g)).toHaveLength(3)
  })
})
