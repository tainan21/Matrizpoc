import { EventEmitter } from "node:events"
import { describe, expect, it } from "vitest"

import { createAccessApiHandler } from "./access-api"

class Response extends EventEmitter {
  statusCode = 0; body = ""; headers = new Map<string, unknown>()
  setHeader(name: string, value: unknown) { this.headers.set(name, value) }
  writeHead(status: number, headers?: Record<string, unknown>) { this.statusCode = status; Object.entries(headers ?? {}).forEach(([k, v]) => this.setHeader(k, v)); return this }
  end(body = "") { this.body += body; return this }
}

const token = { userId: "user-1", clientId: "client-spot", sessionId: "session-1", authTime: 1720000000, acr: "urn:matriz:loa:2", amr: ["pwd", "otp"] }
const eligible = [{ tenantId: "tenant-1", tenantName: "Acme", membershipId: "membership-1", tenantRoles: ["owner"], appRoles: ["manager"], capabilities: ["spot.read"] }]

describe("access exchange API", () => {
  it("binds requested tenant to the token client app and active server-side access", async () => {
    const response = new Response()
    const handler = createAccessApiHandler({
      issuer: "https://identity.test", csrfSecret: "s".repeat(32), rateLimits: { consume: async () => true },
      tokens: { verify: async () => token },
      access: { findClientAppId: async () => "spot", findEligibleTenants: async (input) => { expect(input).toEqual({ userId: "user-1", appId: "spot" }); return eligible }, audit: async () => undefined },
    })
    await handler({ url: "/api/access/exchange", method: "POST", headers: { authorization: "Bearer opaque" }, socket: {}, [Symbol.asyncIterator]: async function* () { yield Buffer.from('{"tenantId":"tenant-1"}') } } as never, response as never)
    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toMatchObject({ user: { id: "user-1" }, context: { tenantId: "tenant-1", appId: "spot", sessionId: "session-1" }, eligibleTenants: [{ tenantId: "tenant-1" }] })
    expect(JSON.parse(response.body).claims).toMatchObject({ tenant_id: "tenant-1", membership_id: "membership-1", tenant_roles: ["owner"], app_roles: ["manager"], capabilities: ["spot.read"], auth_time: 1720000000, acr: "urn:matriz:loa:2", amr: ["pwd", "otp"], sid: "session-1" })
  })

  it("denies a tenant that has no active membership and app grant", async () => {
    const response = new Response()
    const handler = createAccessApiHandler({ issuer: "https://identity.test", csrfSecret: "s".repeat(32), rateLimits: { consume: async () => true }, tokens: { verify: async () => token }, access: { findClientAppId: async () => "spot", findEligibleTenants: async () => eligible, audit: async () => undefined } })
    await handler({ url: "/api/access/exchange", method: "POST", headers: { authorization: "Bearer opaque" }, socket: {}, [Symbol.asyncIterator]: async function* () { yield Buffer.from('{"tenantId":"tenant-2"}') } } as never, response as never)
    expect(response.statusCode).toBe(403)
  })

  it("requires same-origin, CSRF and rate allowance to switch and audits success", async () => {
    const audited: unknown[] = []
    const response = new Response()
    const handler = createAccessApiHandler({ issuer: "https://identity.test", csrfSecret: "s".repeat(32), rateLimits: { consume: async () => true }, tokens: { verify: async () => token }, access: { findClientAppId: async () => "spot", findEligibleTenants: async () => eligible, audit: async (event) => { audited.push(event) } } })
    await handler({ url: "/api/access/switch", method: "POST", headers: { authorization: "Bearer opaque", origin: "https://identity.test", "x-csrf-token": "bad" }, socket: {}, [Symbol.asyncIterator]: async function* () { yield Buffer.from('{"tenantId":"tenant-1"}') } } as never, response as never)
    expect(response.statusCode).toBe(403)
    expect(audited).toHaveLength(0)
  })

  it("audits a switch only after successful token issuance", async () => {
    const response = new Response(); const order: string[] = []
    const handler = createAccessApiHandler({ issuer: "https://identity.test", csrfSecret: "s".repeat(32), now: () => 1720000010, rateLimits: { consume: async () => true }, tokens: { verify: async () => token, issue: async () => { order.push("issue"); return { accessToken: "new-access", idToken: "new-id" } } }, access: { findClientAppId: async () => "spot", findEligibleTenants: async () => eligible, audit: async () => { order.push("audit") } } })
    const { createAccessCsrfToken } = await import("./access-api")
    await handler({ url: "/api/access/switch", method: "POST", headers: { authorization: "Bearer opaque", origin: "https://identity.test", "x-csrf-token": createAccessCsrfToken("session-1", "s".repeat(32)) }, socket: {}, [Symbol.asyncIterator]: async function* () { yield Buffer.from('{"tenantId":"tenant-1"}') } } as never, response as never)
    expect(JSON.parse(response.body).tokens).toEqual({ accessToken: "new-access", idToken: "new-id" })
    expect(order).toEqual(["issue", "audit"])
  })

  it("does not audit a switch when token issuance fails", async () => {
    const audited: unknown[] = []
    const response = new Response()
    const handler = createAccessApiHandler({ issuer: "https://identity.test", csrfSecret: "s".repeat(32), now: () => 1720000010, rateLimits: { consume: async () => true }, tokens: { verify: async () => token, issue: async () => { throw new Error("issuer unavailable") } }, access: { findClientAppId: async () => "spot", findEligibleTenants: async () => eligible, audit: async (event) => { audited.push(event) } } })
    const { createAccessCsrfToken } = await import("./access-api")
    await expect(handler({ url: "/api/access/switch", method: "POST", headers: { authorization: "Bearer opaque", origin: "https://identity.test", "x-csrf-token": createAccessCsrfToken("session-1", "s".repeat(32)) }, socket: {}, [Symbol.asyncIterator]: async function* () { yield Buffer.from('{"tenantId":"tenant-1"}') } } as never, response as never)).rejects.toThrow("issuer unavailable")
    expect(audited).toHaveLength(0)
  })

  it("requires fresh MFA before switching tenant", async () => {
    const response = new Response()
    const handler = createAccessApiHandler({ issuer: "https://identity.test", csrfSecret: "s".repeat(32), now: () => 1720000010, rateLimits: { consume: async () => true }, tokens: { verify: async () => ({ ...token, amr: ["pwd"] }), issue: async () => ({ accessToken: "never" }) }, access: { findClientAppId: async () => "spot", findEligibleTenants: async () => eligible, audit: async () => undefined } })
    const { createAccessCsrfToken } = await import("./access-api")
    await handler({ url: "/api/access/switch", method: "POST", headers: { authorization: "Bearer opaque", origin: "https://identity.test", "x-csrf-token": createAccessCsrfToken("session-1", "s".repeat(32)) }, socket: {}, [Symbol.asyncIterator]: async function* () { yield Buffer.from('{"tenantId":"tenant-1"}') } } as never, response as never)
    expect(response.statusCode).toBe(403)
    expect(JSON.parse(response.body)).toEqual({ error: "mfa_step_up_required" })
  })

  it("requires verified step-up acr even when amr and auth_time look fresh", async () => {
    const response = new Response()
    const handler = createAccessApiHandler({ issuer: "https://identity.test", csrfSecret: "s".repeat(32), now: () => 1720000010, rateLimits: { consume: async () => true }, tokens: { verify: async () => ({ ...token, acr: "urn:matriz:loa:1" }), issue: async () => ({ accessToken: "never" }) }, access: { findClientAppId: async () => "spot", findEligibleTenants: async () => eligible, audit: async () => undefined } })
    const { createAccessCsrfToken } = await import("./access-api")
    await handler({ url: "/api/access/switch", method: "POST", headers: { authorization: "Bearer opaque", origin: "https://identity.test", "x-csrf-token": createAccessCsrfToken("session-1", "s".repeat(32)), "x-mfa-proof": "attacker-controlled" }, socket: {}, [Symbol.asyncIterator]: async function* () { yield Buffer.from('{"tenantId":"tenant-1"}') } } as never, response as never)
    expect(response.statusCode).toBe(403)
    expect(JSON.parse(response.body)).toEqual({ error: "mfa_step_up_required" })
  })
})
