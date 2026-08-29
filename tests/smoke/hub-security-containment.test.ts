import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "node:fs"
import type { AuthSession } from "@matriz/platform-auth"
import { allowHubRequest, createHubSessionStore, getHubRequestContext, hubSessionStore, HubAuthError } from "../../apps/matriz-hub/src/auth/hub-session"
import { handleMcpRequest } from "../../apps/matriz-hub/src/mcp/handler"
import { readBoundedText, RequestBodyTooLargeError } from "../../apps/matriz-hub/src/http/bounded-body"
import { callTool } from "../../apps/matriz-hub/src/mcp/tools"
import { PUT as putSharedCache } from "../../apps/matriz-hub/app/api/ecosystem/cache/route"
import { POST as postMockEmail } from "../../apps/matriz-hub/app/api/auth/mock/email/route"
import { POST as postMockGoogle } from "../../apps/matriz-hub/app/api/auth/mock/google/route"

const session: AuthSession = {
  identity: {
    user: { id: "user_tai" as AuthSession["identity"]["user"]["id"], name: "Tai", email: "tai@example.test" },
    tenants: [{
      tenantId: "tenant_demo" as AuthSession["activeTenantId"],
      tenantName: "Demo",
      roles: ["owner"],
      enabledApps: ["matriz-hub" as never],
    }],
  },
  activeTenantId: "tenant_demo" as AuthSession["activeTenantId"],
  issuedAt: "2026-08-12T10:00:00.000Z",
  expiresAt: "2026-08-12T11:00:00.000Z",
  strategyId: "mock",
}

const previousAuthAdapter = process.env.NEXT_PUBLIC_MATRIZ_AUTH_ADAPTER
beforeAll(() => { process.env.NEXT_PUBLIC_MATRIZ_AUTH_ADAPTER = "mock" })
afterAll(() => {
  if (previousAuthAdapter === undefined) delete process.env.NEXT_PUBLIC_MATRIZ_AUTH_ADAPTER
  else process.env.NEXT_PUBLIC_MATRIZ_AUTH_ADAPTER = previousAuthAdapter
})

describe("Hub containment", () => {
  it("RED: rejects missing and forged cookies, and never accepts actor headers", () => {
    const store = createHubSessionStore({ now: () => new Date("2026-08-12T10:30:00.000Z"), randomToken: () => "opaque-session" })
    store.create(session)

    expect(() => getHubRequestContext(new Request("http://hub.test/api/docs", {
      headers: { cookie: "matriz_mock_session=forged", "x-tenant-id": "other", "x-actor-id": "admin" },
    }), store)).toThrow(HubAuthError)

    const context = getHubRequestContext(new Request("http://hub.test/api/docs", {
      headers: { cookie: "matriz_mock_session=opaque-session", "x-tenant-id": "other", "x-actor-id": "admin" },
    }), store)
    expect(context.session).toMatchObject({ activeTenantId: "tenant_demo", identity: { user: { id: "user_tai" } } })
  })

  it("RED: expires and revokes only the issued opaque session", () => {
    let now = new Date("2026-08-12T10:30:00.000Z")
    const store = createHubSessionStore({ now: () => now, randomToken: () => "own-token" })
    store.create(session)
    store.revoke("own-token")
    expect(store.resolve("own-token")).toBeNull()
    now = new Date("2026-08-12T12:00:00.000Z")
    expect(store.resolve("own-token")).toBeNull()
  })

  it("RED: lets public MCP advertisement methods through but rejects tenant tools without a server principal", async () => {
    const publicResponse = await handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" })
    expect("result" in publicResponse).toBe(true)
    const denied = await handleMcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search_docs" } })
    expect(denied).toMatchObject({ error: { code: -32603, message: "Authentication required" } })
  })

  it("preserves JSON-RPC validation before authentication while denying valid data calls", async () => {
    expect(await handleMcpRequest({ jsonrpc: "2.0", id: 3, method: "not/a/method" })).toMatchObject({ error: { code: -32601 } })
    expect(await handleMcpRequest({ jsonrpc: "2.0", id: 4, method: "resources/read" })).toMatchObject({ error: { code: -32602 } })
    expect(await handleMcpRequest({ jsonrpc: "2.0", id: 5, method: "resources/read", params: { uri: "matriz://docs" } })).toMatchObject({ error: { code: -32603, message: "Authentication required" } })
  })

  it("rejects streamed bodies that exceed the limit even without Content-Length", async () => {
    const body = "x".repeat(65 * 1024)
    await expect(readBoundedText(new Request("http://hub.test", { method: "POST", body }), 64 * 1024)).rejects.toBeInstanceOf(RequestBodyTooLargeError)
  })

  it("does not expose ingestion exception text through MCP tool results", async () => {
    const result = await callTool("refresh_project_ingestion", {}, { docsActor: { tenantId: "tenant_demo", actorId: "user_tai", actorType: "human_user" }, userId: "user_tai", tenantId: "tenant_demo" })
    expect(result.content[0]?.text).not.toMatch(/error|stack|prisma|path/i)
  })

  it("keeps the demo actor out of request-reachable Docs pages and APIs", () => {
    const files = globSync("apps/matriz-hub/{app/docs,app/api}/**/*.{ts,tsx}")
    expect(files).not.toHaveLength(0)
    for (const file of files) expect(readFileSync(file, "utf8")).not.toContain("defaultDocsActorContext")
    expect(readFileSync("apps/matriz-hub/app/docs/layout.tsx", "utf8")).toContain("getDocsPageActorContext")
  })

  it("bounds MCP requests per authenticated principal without trusting IP headers", () => {
    const principal = `rate-${Date.now()}`
    for (let index = 0; index < 30; index += 1) expect(allowHubRequest(principal)).toBe(true)
    expect(allowHubRequest(principal)).toBe(false)
  })

  it("RED: rejects an authenticated shared-cache PUT without an explicit same origin", async () => {
    const token = hubSessionStore.create({ ...session, expiresAt: new Date(Date.now() + 60_000).toISOString() })
    const response = await putSharedCache(new Request("http://hub.test/api/ecosystem/cache", {
      method: "PUT",
      headers: { cookie: `matriz_mock_session=${token}`, "content-type": "application/json" },
      body: JSON.stringify({ key: "origin-regression", value: "must-not-write" }),
    }))
    expect(response.status).toBe(403)
  })

  it("RED: rejects oversized streamed shared-cache writes without Content-Length", async () => {
    const token = hubSessionStore.create({ ...session, expiresAt: new Date(Date.now() + 60_000).toISOString() })
    const response = await putSharedCache(new Request("http://hub.test/api/ecosystem/cache", {
      method: "PUT",
      headers: { origin: "http://hub.test", cookie: `matriz_mock_session=${token}`, "content-type": "application/json" },
      body: JSON.stringify({ key: "too-large", value: "x".repeat(9 * 1024) }),
    }))
    expect(response.status).toBe(413)
  })

  it("RED: rejects non-JSON shared-cache writes before parsing", async () => {
    const token = hubSessionStore.create({ ...session, expiresAt: new Date(Date.now() + 60_000).toISOString() })
    const response = await putSharedCache(new Request("http://hub.test/api/ecosystem/cache", {
      method: "PUT",
      headers: { origin: "http://hub.test", cookie: `matriz_mock_session=${token}`, "content-type": "text/plain" },
      body: JSON.stringify({ key: "wrong-type", value: "must-not-write" }),
    }))
    expect(response.status).toBe(400)
  })

  it("RED: bounds mock email and Google sign-in attempts before issuing sessions", async () => {
    const origin = "http://localhost:3000"
    const post = (path: string, body: object) => new Request(`${origin}${path}`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const email = `limited-${Date.now()}@example.test`
    const accountId = `limited-${Date.now()}`

    for (let index = 0; index < 5; index += 1) {
      expect((await postMockEmail(post("/api/auth/mock/email", { email }))).status).not.toBe(429)
      expect((await postMockGoogle(post("/api/auth/mock/google", { accountId }))).status).not.toBe(429)
    }
    expect((await postMockEmail(post("/api/auth/mock/email", { email }))).status).toBe(429)
    expect((await postMockGoogle(post("/api/auth/mock/google", { accountId }))).status).toBe(429)
  })
})
