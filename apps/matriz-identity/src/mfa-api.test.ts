import { EventEmitter } from "node:events"
import { describe, expect, it } from "vitest"
import { createMfaApiHandler } from "./mfa-api"

class Response extends EventEmitter {
  statusCode = 0; body = ""; headers = new Map<string, unknown>()
  setHeader(name: string, value: unknown) { this.headers.set(name, value) }
  writeHead(status: number, headers?: Record<string, unknown>) { this.statusCode = status; Object.entries(headers ?? {}).forEach(([key, value]) => this.setHeader(key, value)); return this }
  end(body = "") { this.body += body; return this }
}

function request(path: string, body: unknown) {
  return { url: path, method: "POST", headers: { authorization: "Bearer access" }, socket: {}, [Symbol.asyncIterator]: async function* () { yield Buffer.from(JSON.stringify(body)) } } as never
}

const recentPrimary = { userId: "user-1", clientId: "client-spot", sessionId: "session-1", authTime: 1_720_000_000, acr: "urn:matriz:loa:1", amr: ["pwd"] }

describe("MFA HTTP API", () => {
  it("enrolls with encrypted storage and verifies TOTP before activation", async () => {
    const calls: string[] = []
    const repository = {
      requiresMfa: async () => true,
      createTotp: async (input: { secretCiphertext: string }) => { expect(input.secretCiphertext).toMatch(/^aes-256-gcm-v1\$/); calls.push("create"); return { id: "mfa-1" } },
      findTotp: async () => ({ id: "mfa-1", userId: "user-1", secretCiphertext: "", verifiedAt: null }),
      advanceCounter: async () => true, markVerified: async () => { calls.push("verify") }, audit: async () => { calls.push("audit") },
      findActive: async () => [], consume: async () => false,
    }
    const handler = createMfaApiHandler({ encryptionKey: Buffer.alloc(32, 4).toString("base64url"), now: () => 1_720_000_010, rateLimits: { consume: async () => true }, tokens: { verify: async () => recentPrimary }, repository })
    const response = new Response()
    await handler(request("/api/mfa/enroll", {}), response as never)
    expect(response.statusCode).toBe(201)
    expect(JSON.parse(response.body)).toMatchObject({ methodId: "mfa-1", otpauthUri: expect.stringContaining("otpauth://totp/") })
    expect(calls).toEqual(["create"])
  })

  it("rejects challenge when no verified method belongs to the authenticated user", async () => {
    const response = new Response()
    const handler = createMfaApiHandler({ encryptionKey: Buffer.alloc(32, 4).toString("base64url"), now: () => 1_720_000_010, rateLimits: { consume: async () => true }, tokens: { verify: async () => recentPrimary }, repository: { requiresMfa: async () => false, createTotp: async () => ({ id: "x" }), findTotp: async () => null, advanceCounter: async () => false, markVerified: async () => undefined, audit: async () => undefined, findActive: async () => [], consume: async () => false } })
    await handler(request("/api/mfa/challenge", { methodId: "foreign", code: "123456" }), response as never)
    expect(response.statusCode).toBe(401)
  })

  it.each([
    { name: "missing auth_time", token: { ...recentPrimary, authTime: undefined } },
    { name: "stale primary authentication", token: { ...recentPrimary, authTime: 1_719_999_000 } },
    { name: "missing acr", token: { ...recentPrimary, acr: undefined } },
    { name: "unverified authentication method", token: { ...recentPrimary, amr: [] } },
  ])("rejects standalone MFA with $name", async ({ token }) => {
    const response = new Response()
    const handler = createMfaApiHandler({ encryptionKey: Buffer.alloc(32, 4).toString("base64url"), now: () => 1_720_000_010, rateLimits: { consume: async () => true }, tokens: { verify: async () => token }, repository: { requiresMfa: async () => false, createTotp: async () => ({ id: "x" }), findTotp: async () => null, advanceCounter: async () => false, markVerified: async () => undefined, audit: async () => undefined, findActive: async () => [], consume: async () => false } })
    await handler(request("/api/mfa/enroll", {}), response as never)
    expect(response.statusCode).toBe(403)
    expect(JSON.parse(response.body)).toEqual({ error: "recent_authentication_required" })
  })

  it("rate limits standalone MFA through the supplied durable store", async () => {
    const consumed: unknown[] = []; const response = new Response()
    const handler = createMfaApiHandler({ encryptionKey: Buffer.alloc(32, 4).toString("base64url"), now: () => 1_720_000_010, rateLimits: { consume: async (entry) => { consumed.push(entry); return false } }, tokens: { verify: async () => recentPrimary }, repository: { requiresMfa: async () => false, createTotp: async () => ({ id: "x" }), findTotp: async () => null, advanceCounter: async () => false, markVerified: async () => undefined, audit: async () => undefined, findActive: async () => [], consume: async () => false } })
    await handler(request("/api/mfa/challenge", { methodId: "mfa-1", code: "123456" }), response as never)
    expect(response.statusCode).toBe(429)
    expect(consumed).toEqual([{ key: "mfa\u0000client-spot\u0000user-1\u0000/api/mfa/challenge", limit: 10, windowMs: 60_000 }])
  })
})
