import { describe, expect, it, vi } from "vitest"
import { withTenantContext } from "../../packages/platform/db/src/tenant-context"

describe("withTenantContext", () => {
  it("sets tenant context transaction-locally before application work", async () => {
    const execute = vi.fn().mockResolvedValue(1)
    const tx = { $executeRawUnsafe: execute }
    const client = { $transaction: vi.fn(async (work: (value: typeof tx) => unknown) => work(tx)) }

    await expect(withTenantContext(client, "tenant-a", async (value) => value === tx)).resolves.toBe(true)
    expect(execute).toHaveBeenCalledWith("SELECT set_config('matriz.tenant_id', $1, true)", "tenant-a")
  })

  it.each(["", " ", "tenant\nspoof", "x".repeat(257)])("rejects an invalid tenant id: %j", async (tenantId) => {
    const client = { $transaction: vi.fn() }
    await expect(withTenantContext(client, tenantId, async () => undefined)).rejects.toThrow("Invalid tenant id")
    expect(client.$transaction).not.toHaveBeenCalled()
  })
})
