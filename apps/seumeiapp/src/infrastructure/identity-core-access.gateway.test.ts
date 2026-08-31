import { afterEach, describe, expect, it, vi } from "vitest"
import { createIdentityCoreAccessGateway, IdentityServiceUnavailableError } from "./identity-core-access.gateway"

afterEach(() => vi.unstubAllGlobals())

describe("Identity Core access gateway", () => {
  it("binds requests to the Seumei service identity", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ result: true }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    const gateway = createIdentityCoreAccessGateway({ MATRIZ_IDENTITY_ISSUER: "http://127.0.0.1:8080", SEUMEI_IDENTITY_SERVICE_TOKEN: "x".repeat(32) })
    await expect(gateway.hasSeumeiMembership("user-a", "tenant-a")).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8080/api/internal/v1/seumei/access", expect.objectContaining({ headers: expect.objectContaining({ "x-matriz-app-id": "seumei", authorization: `Bearer ${"x".repeat(32)}` }), body: JSON.stringify({ action: "hasSeumeiMembership", input: { userId: "user-a", tenantId: "tenant-a" } }) }))
  })

  it("returns a sanitized error when Identity is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connect ECONNREFUSED secret-host") }))
    const gateway = createIdentityCoreAccessGateway({ MATRIZ_IDENTITY_ISSUER: "http://127.0.0.1:8080", SEUMEI_IDENTITY_SERVICE_TOKEN: "x".repeat(32) })
    await expect(gateway.listSeumeiMemberships("user-a")).rejects.toEqual(new IdentityServiceUnavailableError())
  })
})
