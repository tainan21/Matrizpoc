import { describe, expect, it, vi } from "vitest"
import { MissingTenantContextError, readHomeSummary } from "./read-home-summary"

describe("readHomeSummary", () => {
  it("rejects requests without a tenant before touching persistence", async () => {
    const repository = { listByTenant: vi.fn() }
    await expect(readHomeSummary({ tenantId: "", tenantName: "", userName: "Ana" }, repository))
      .rejects.toBeInstanceOf(MissingTenantContextError)
    expect(repository.listByTenant).not.toHaveBeenCalled()
  })

  it("returns one real tenant-scoped establishment summary", async () => {
    const repository = { listByTenant: vi.fn().mockResolvedValue([
      { id: "est_1", name: "Loja Centro", city: "São Paulo", status: "ACTIVE" },
    ]) }
    await expect(readHomeSummary({ tenantId: "tenant_1", tenantName: "Matriz", userName: "Ana" }, repository))
      .resolves.toMatchObject({ tenantId: "tenant_1", establishmentCount: 1, firstEstablishment: { name: "Loja Centro" } })
    expect(repository.listByTenant).toHaveBeenCalledWith("tenant_1")
  })
})
