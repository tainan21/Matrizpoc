import { describe, expect, it } from "vitest"
import { createClientAdminHttpHandler } from "./http"
import { createClientAdminService } from "./application"
import { createMemoryClientAdminRepository } from "./integration/memory-repository"

describe("Client Admin HTTP", () => {
  it("derives the tenant from the authenticated actor", async () => {
    const handler = createClientAdminHttpHandler({
      resolveActor: async () => ({ tenantId: "tenant-laudate", tenantName: "Laudate", capabilities: ["client-admin.dashboard.read"] }),
      service: createClientAdminService({ repository: createMemoryClientAdminRepository() }),
    })
    const response = await handler(new Request("http://hub.test/api/client-admin/v1/overview?tenantId=attacker"), "overview")
    expect((await response.json()).tenant.id).toBe("tenant-laudate")
  })

  it("denies users without the dashboard capability", async () => {
    const handler = createClientAdminHttpHandler({ resolveActor: async () => ({ tenantId: "tenant-laudate", tenantName: "Laudate", capabilities: [] }), service: createClientAdminService({ repository: createMemoryClientAdminRepository() }) })
    expect((await handler(new Request("http://hub.test/api/client-admin/v1/overview"), "overview")).status).toBe(403)
  })

  it("requires the refresh capability for provider updates", async () => {
    const handler = createClientAdminHttpHandler({ resolveActor: async () => ({ tenantId: "tenant-laudate", tenantName: "Laudate", capabilities: ["client-admin.dashboard.read"] }), service: createClientAdminService({ repository: createMemoryClientAdminRepository() }) })
    expect((await handler(new Request("http://hub.test/api/client-admin/v1/refresh", { method: "POST" }), "overview")).status).toBe(403)
  })
})
