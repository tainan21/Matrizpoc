import { describe, expect, it, vi } from "vitest"
import type { AuthSession } from "@matriz/platform-auth"

const session = {
  identity: { user: { id: "user_a", name: "Ana", email: "ana@example.com" }, tenants: [] },
  activeTenantId: "tenant_demo",
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  strategyId: "otp",
} as unknown as AuthSession

describe("mock auth server sessions", () => {
  it("restores a request session after the route module is reloaded", async () => {
    const first = await import("./mock-auth-server")
    const response = first.sessionResponse(new Request("http://localhost:3000", { headers: { origin: "http://localhost:3008" } }), session)
    const cookie = response.headers.get("set-cookie")?.split(";")[0]
    expect(cookie).toBeTruthy()

    vi.resetModules()
    const reloaded = await import("./mock-auth-server")
    expect(reloaded.getRequestMockSession(new Request("http://localhost:3000", { headers: { cookie: cookie! } }))).toEqual(session)
  })
})
