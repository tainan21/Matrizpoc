import { EventEmitter } from "node:events"
import { describe, expect, it } from "vitest"

import { createInteractionHandler, requestIp } from "./interactions"

class Response extends EventEmitter {
  statusCode = 0
  headers = new Map<string, unknown>()
  body = ""
  setHeader(name: string, value: unknown) { this.headers.set(name, value) }
  writeHead(status: number, headers?: Record<string, unknown>) { this.statusCode = status; for (const [key, value] of Object.entries(headers ?? {})) this.setHeader(key, value); return this }
  end(body = "") { this.body += body; this.emit("finish"); return this }
}

describe("secure OIDC interactions", () => {
  it("renders a bounded custom login with CSRF and no dev credential bypass", async () => {
    const provider = { interactionDetails: async () => ({ uid: "uid-1", prompt: { name: "login", details: {} } }) }
    const response = new Response()
    const handler = createInteractionHandler({ provider: provider as never, authenticator: { authenticate: async () => null }, rateLimits: { consume: async () => true }, issuer: "https://identity.test", csrfSecret: "x".repeat(32) })
    const handled = await handler({ url: "/interaction/uid-1", method: "GET", headers: {}, socket: {} } as never, response as never)
    expect(handled).toBe(true)
    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('name="csrf"')
    expect(response.body).toContain('name="credential" type="password"')
    expect(response.headers.get("Content-Security-Policy")).toContain("form-action 'self'")
  })

  it("rejects POST without same-origin and never calls authenticator", async () => {
    let called = false
    const provider = { interactionDetails: async () => ({ uid: "uid-1", prompt: { name: "login", details: {} } }) }
    const response = new Response()
    const handler = createInteractionHandler({ provider: provider as never, authenticator: { authenticate: async () => { called = true; return null } }, rateLimits: { consume: async () => true }, issuer: "https://identity.test", csrfSecret: "x".repeat(32) })
    await handler({ url: "/interaction/uid-1", method: "POST", headers: { origin: "https://evil.test" }, socket: {} } as never, response as never)
    expect(response.statusCode).toBe(403)
    expect(called).toBe(false)
  })

  it("uses only the configured trusted proxy hop and validates forwarded IPs", () => {
    const request = { headers: { "x-forwarded-for": "198.51.100.7, 203.0.113.9" }, socket: { remoteAddress: "10.0.0.5" } } as never
    expect(requestIp(request, false, 1)).toBe("10.0.0.5")
    expect(requestIp(request, true, 1)).toBe("203.0.113.9")
    expect(requestIp(request, true, 2)).toBe("198.51.100.7")
    expect(requestIp({ headers: { "x-forwarded-for": "spoofed" }, socket: { remoteAddress: "10.0.0.5" } } as never, true, 1)).toBe("10.0.0.5")
  })

  it("continues the same login interaction with signed MFA state and finishes only after proof", async () => {
    let finished = false
    const provider = { interactionDetails: async () => ({ uid: "uid-1", prompt: { name: "login", details: {} }, params: { client_id: "spot" } }), interactionFinished: async () => { finished = true } }
    const handler = createInteractionHandler({ provider: provider as never, authenticator: { authenticate: async () => ({ accountId: "user-1", mfaRequired: true, amr: ["pwd"] }) }, mfaChallenge: { verifyTotp: async (_user, code) => code === "123456", verifyRecovery: async () => false }, rateLimits: { consume: async () => true }, issuer: "https://identity.test", csrfSecret: "x".repeat(32) })
    const getResponse = new Response()
    await handler({ url: "/interaction/uid-1", method: "GET", headers: {}, socket: {} } as never, getResponse as never)
    const csrf = /name="csrf" value="([^"]+)"/.exec(getResponse.body)![1]
    const response = new Response()
    await handler({ url: "/interaction/uid-1", method: "POST", headers: { origin: "https://identity.test" }, socket: {}, [Symbol.asyncIterator]: async function* () { yield Buffer.from(`csrf=${csrf}&login=user%40test&credential=correct`) } } as never, response as never)
    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('name="mfa_state"')
    expect(finished).toBe(false)

    const state = /name="mfa_state" value="([^"]+)"/.exec(response.body)![1]
    const proof = new Response()
    await handler({ url: "/interaction/uid-1", method: "POST", headers: { origin: "https://identity.test" }, socket: {}, [Symbol.asyncIterator]: async function* () { yield Buffer.from(`csrf=${csrf}&mfa_state=${encodeURIComponent(state)}&code=123456&proof=totp`) } } as never, proof as never)
    expect(finished).toBe(true)
  })

  it("accepts a recovery proof inside the interaction without bearer authentication", async () => {
    let completed: unknown
    const provider = { interactionDetails: async () => ({ uid: "uid-2", prompt: { name: "login", details: {} }, params: { client_id: "spot" } }), interactionFinished: async (_request: unknown, _response: unknown, result: unknown) => { completed = result } }
    const handler = createInteractionHandler({ provider: provider as never, authenticator: { authenticate: async () => ({ accountId: "user-2", mfaRequired: true, amr: ["pwd"] }) }, mfaChallenge: { verifyTotp: async () => false, verifyRecovery: async (_user, code) => code === "recovery-code" }, rateLimits: { consume: async () => true }, issuer: "https://identity.test", csrfSecret: "y".repeat(32) })
    const get = new Response(); await handler({ url: "/interaction/uid-2", method: "GET", headers: {}, socket: {} } as never, get as never)
    const csrf = /name="csrf" value="([^"]+)"/.exec(get.body)![1]
    const password = new Response(); await handler({ url: "/interaction/uid-2", method: "POST", headers: { origin: "https://identity.test" }, socket: {}, [Symbol.asyncIterator]: async function* () { yield Buffer.from(`csrf=${csrf}&login=user&credential=correct`) } } as never, password as never)
    const state = /name="mfa_state" value="([^"]+)"/.exec(password.body)![1]
    await handler({ url: "/interaction/uid-2", method: "POST", headers: { origin: "https://identity.test" }, socket: {}, [Symbol.asyncIterator]: async function* () { yield Buffer.from(`csrf=${csrf}&mfa_state=${encodeURIComponent(state)}&code=recovery-code&proof=recovery`) } } as never, new Response() as never)
    expect(completed).toEqual({ login: { accountId: "user-2", acr: "urn:matriz:loa:2", amr: ["pwd", "otp"] } })
  })
})
