import { describe, expect, it } from "vitest"
import { createClientAdminService } from "./application"
import { createMemoryClientAdminRepository } from "./integration/memory-repository"

describe("Client Admin application", () => {
  it("returns an operational empty dashboard when no client data is registered", async () => {
    const service = createClientAdminService({ repository: createMemoryClientAdminRepository() })
    const dashboard = await service.dashboard({ tenantId: "tenant-laudate", tenantName: "Laudate" })

    expect(dashboard.tenant.name).toBe("Laudate")
    expect(dashboard.metrics).toEqual([])
    expect(dashboard.sections.systems.state).toBe("empty")
    expect(dashboard.sections.payments.state).toBe("empty")
    expect(dashboard.sections.integrations.state).toBe("not_configured")
    expect(dashboard.attention.map((item) => item.title)).toContain("Vercel não configurado")
    expect(dashboard.attention.map((item) => item.title)).toContain("Google Analytics não configurado")
  })

  it("uses the last cached dashboard as stale when the repository is unavailable", async () => {
    const cached = await createClientAdminService({ repository: createMemoryClientAdminRepository() })
      .dashboard({ tenantId: "tenant-laudate", tenantName: "Laudate" })
    const cache = {
      read: async () => cached,
      write: async () => undefined,
    }
    const repository = createMemoryClientAdminRepository()
    repository.fail(new Error("database unavailable"))
    const service = createClientAdminService({ repository, cache })

    const dashboard = await service.dashboard({ tenantId: "tenant-laudate", tenantName: "Laudate" })

    expect(dashboard.sections.systems.state).toBe("stale")
    expect(dashboard.sections.systems.error?.code).toBe("DATA_UNAVAILABLE")
  })

  it("derives payment attention and metrics only from real rows", async () => {
    const repository = createMemoryClientAdminRepository({
      payments: [{ id: "pay-1", tenantId: "tenant-laudate", description: "Mensalidade", amountCents: 125000, currency: "BRL", status: "overdue", dueAt: "2026-08-01T12:00:00.000Z", paidAt: null, externalReference: null, lastSyncedAt: "2026-08-31T12:00:00.000Z" }],
    })
    const dashboard = await createClientAdminService({ repository }).dashboard({ tenantId: "tenant-laudate", tenantName: "Laudate" })

    expect(dashboard.metrics).toContainEqual(expect.objectContaining({ id: "payments-pending", value: 125000 }))
    expect(dashboard.attention).toContainEqual(expect.objectContaining({ severity: "critical", href: "/payments" }))
  })

  it("keeps healthy sections available when one projection fails", async () => {
    const repository = createMemoryClientAdminRepository()
    repository.load = async () => ({ systems: [], sources: [], snapshots: [], payments: [], unavailableSections: ["site"] })
    const dashboard = await createClientAdminService({ repository }).dashboard({ tenantId: "tenant-laudate", tenantName: "Laudate" })
    expect(dashboard.sections.site.state).toBe("unavailable")
    expect(dashboard.sections.systems.state).toBe("empty")
    expect(dashboard.sections.payments.state).toBe("empty")
  })
})
