import { describe, expect, it } from "vitest"
import { resolveClientAdminBearerActor } from "./access"

describe("Client Admin bearer access", () => {
  it("accepts only the tenant and capability verified by Identity", async () => {
    const actor = await resolveClientAdminBearerActor(new Request("http://hub.test", { headers: { authorization: "Bearer user-token", "x-matriz-tenant-id": "tenant-laudate" } }), {
      issuer: "https://identity.test",
      fetcher: async (_url, init) => {
        expect(init?.body).toBe(JSON.stringify({ tenantId: "tenant-laudate" }))
        return Response.json({ context: { tenantId: "tenant-laudate", appId: "matriz-client-admin", capabilities: ["client-admin.dashboard.read"] }, eligibleTenants: [{ tenantId: "tenant-laudate", tenantName: "Laudate" }] })
      },
    })
    expect(actor).toEqual({ tenantId: "tenant-laudate", tenantName: "Laudate", capabilities: ["client-admin.dashboard.read"] })
  })

  it("rejects a tenant mismatch returned by Identity", async () => {
    await expect(resolveClientAdminBearerActor(new Request("http://hub.test", { headers: { authorization: "Bearer token", "x-matriz-tenant-id": "tenant-a" } }), { issuer: "https://identity.test", fetcher: async () => Response.json({ context: { tenantId: "tenant-b", appId: "matriz-client-admin", capabilities: [] }, eligibleTenants: [] }) })).resolves.toBeNull()
  })
})
