import { createServer } from "node:http"
import { createHash, generateKeyPairSync } from "node:crypto"
import { afterEach, describe, expect, it } from "vitest"
import Provider from "oidc-provider"

import { buildProviderConfiguration } from "./config"
import { createInteractionHandler } from "./interactions"
import { createNeonAdapterFactory, type SqlExecutor } from "./neon-adapter"

const servers: Array<ReturnType<typeof createServer>> = []
afterEach(async () => Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))))

describe("OIDC protocol surface", () => {
  it("publishes discovery and JWKS with code, S256 and revocation", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
    const jwk = privateKey.export({ format: "jwk" })
    const configuration = {
      ...buildProviderConfiguration({
        issuer: "http://127.0.0.1",
        databaseUrl: "postgresql://unused",
        jwks: { keys: [{ ...jwk, kid: "test-key", use: "sig", alg: "RS256" } as JsonWebKey] },
        trustProxy: false, trustedProxyHops: 0,
        port: 0,
        csrfSecret: "x".repeat(32),
      }),
      clients: [{
        client_id: "test-client",
        redirect_uris: ["http://127.0.0.1/callback"],
        response_types: ["code"],
        grant_types: ["authorization_code", "refresh_token"],
        token_endpoint_auth_method: "none",
      }],
    }
    const provider = new Provider("http://127.0.0.1", configuration)
    const server = createServer(provider.callback())
    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("test server did not bind")

    const response = await fetch(`http://127.0.0.1:${address.port}/.well-known/openid-configuration`)
    const discovery = await response.json() as Record<string, unknown>
    expect(response.status).toBe(200)
    expect(discovery.response_types_supported).toContain("code")
    expect(discovery.code_challenge_methods_supported).toContain("S256")
    expect(discovery.revocation_endpoint).toBeTypeOf("string")
    expect(discovery.jwks_uri).toBeTypeOf("string")
  })

  it("completes code+PKCE, denies replay, rotates refresh family and revokes tokens", async () => {
    const port = 41000 + Math.floor(Math.random() * 1000)
    const issuer = `http://127.0.0.1:${port}`
    const redirectUri = "http://127.0.0.1:39999/callback"
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
    const jwk = privateKey.export({ format: "jwk" })
    const sql = new BehavioralOidcSql()
    const Adapter = createNeonAdapterFactory(sql)
    const configuration = {
      ...buildProviderConfiguration({ issuer, databaseUrl: "unused", jwks: { keys: [{ ...jwk, kid: "e2e", use: "sig", alg: "RS256" } as JsonWebKey] }, trustProxy: false, trustedProxyHops: 0, port, csrfSecret: "x".repeat(32), cookieKeys: ["a".repeat(32), "b".repeat(32)] }),
      adapter: Adapter,
      clients: [{ client_id: "e2e", redirect_uris: [redirectUri], response_types: ["code"], grant_types: ["authorization_code", "refresh_token"], token_endpoint_auth_method: "none" }],
      findAccount: async (_ctx: unknown, id: string) => ({ accountId: id, claims: async () => ({ sub: id }) }),
    }
    const provider = new Provider(issuer, configuration)
    const interaction = createInteractionHandler({ provider, authenticator: { authenticate: async ({ login, credential }) => login === "user@example.test" && credential === "correct credential" ? { accountId: "user-1" } : null }, rateLimits: { consume: async () => true }, issuer, csrfSecret: "x".repeat(32) })
    const server = createServer((req, res) => { void interaction(req, res).then((handled) => { if (!handled) provider.callback()(req, res) }) })
    servers.push(server)
    await new Promise<void>((resolve, reject) => server.listen(port, "127.0.0.1", (error?: Error) => error ? reject(error) : resolve()))
    const verifier = "v".repeat(64)
    const challenge = createHash("sha256").update(verifier).digest("base64url")
    const jar: string[] = []
    let location = `${issuer}/auth?client_id=e2e&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent("openid offline_access")}&prompt=consent&code_challenge=${challenge}&code_challenge_method=S256&state=s1`
    for (let step = 0; step < 12 && !location.startsWith(redirectUri); step++) {
      let response = await jarFetch(location, {}, jar)
      location = new URL(response.headers.get("location")!, location).toString()
      if (location.includes("/interaction/")) {
        response = await jarFetch(location, {}, jar)
        const html = await response.text()
        const csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1]
        const login = html.includes('name="credential"')
        response = await jarFetch(location, { method: "POST", headers: { origin: issuer, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrf: csrf!, ...(login ? { login: "user@example.test", credential: "correct credential" } : {}) }) }, jar)
        location = new URL(response.headers.get("location")!, location).toString()
      }
    }
    const code = new URL(location).searchParams.get("code")!
    const token = async (params: Record<string, string>) => fetch(`${issuer}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: "e2e", ...params }) })
    const first = await token({ grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: verifier })
    expect(first.status).toBe(200)
    const tokens = await first.json() as { refresh_token: string; access_token: string }
    expect(tokens.refresh_token).toBeTypeOf("string")
    const rotated = await token({ grant_type: "refresh_token", refresh_token: tokens.refresh_token })
    expect(rotated.status, await rotated.clone().text()).toBe(200)
    const next = await rotated.json() as { refresh_token: string }
    expect((await token({ grant_type: "refresh_token", refresh_token: tokens.refresh_token })).status).toBe(400)
    expect((await token({ grant_type: "refresh_token", refresh_token: next.refresh_token })).status).toBe(400)
    expect((await token({ grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: verifier })).status).toBe(400)
    const revoke = await fetch(`${issuer}/token/revocation`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: "e2e", token: tokens.access_token }) })
    expect(revoke.status).toBe(200)
    const introspect = await fetch(`${issuer}/token/introspection`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: "e2e", token: tokens.access_token }) })
    expect(introspect.status).toBe(200)
    expect(await introspect.json()).toMatchObject({ active: false })
    expect(sql.statements.some((statement) => statement.includes('SET "consumedAt"'))).toBe(true)
    expect(sql.statements.some((statement) => statement.includes('"grantId" = $1'))).toBe(true)
    const expiryAdapter = new Adapter("Interaction")
    await expiryAdapter.upsert("expired", { uid: "expired" }, -1)
    expect(await expiryAdapter.find("expired")).toBeUndefined()

    // A fresh code cannot be exchanged with a different PKCE verifier.
    const wrongPkceAdapter = new Adapter("AuthorizationCode")
    await wrongPkceAdapter.upsert("wrong-pkce", { clientId: "e2e", accountId: "user-1", redirectUri, codeChallenge: challenge, codeChallengeMethod: "S256", grantId: "g", scope: "openid" }, 60)
    const wrongPkce = await token({ grant_type: "authorization_code", code: "wrong-pkce", redirect_uri: redirectUri, code_verifier: "x".repeat(64) })
    expect(wrongPkce.status).toBe(400)
    expect(await wrongPkce.json()).toMatchObject({ error: "invalid_grant" })
  }, 20_000)
})

class BehavioralOidcSql implements SqlExecutor {
  rows = new Map<string, { payload: Record<string, unknown>; grantId?: string; userCode?: string; uid?: string; expiresAt: number; consumedAt?: Date }>()
  statements: string[] = []
  async query<T extends Record<string, unknown>>(text: string, values: readonly unknown[] = []): Promise<{ rows: T[] }> {
    this.statements.push(text)
    const key = `${values[0]}:${values[1]}`
    if (text.includes("INSERT INTO core.oidc_artifacts")) {
      const payload = JSON.parse(String(values[2])) as Record<string, unknown>
      this.rows.set(key, { payload, grantId: values[3] as string | undefined, userCode: values[4] as string | undefined, uid: values[5] as string | undefined, expiresAt: Date.now() + Number(values[6]) * 1000 })
      return { rows: [] }
    }
    if (text.includes('SELECT "payload", "consumedAt"')) {
      const row = this.rows.get(key)
      return { rows: row && row.expiresAt > Date.now() ? [{ payload: row.payload, consumedAt: row.consumedAt } as unknown as T] : [] }
    }
    if (text.includes('SELECT "payload"')) {
      const model = String(values[0]); const match = [...this.rows.entries()].find(([entryKey, row]) => entryKey.startsWith(`${model}:`) && row.expiresAt > Date.now() && (text.includes('"userCode"') ? row.userCode : row.uid) === values[1])?.[1]
      return { rows: match ? [{ payload: match.payload } as unknown as T] : [] }
    }
    if (text.includes('SET "consumedAt"')) { const row = this.rows.get(key); if (row) row.consumedAt = new Date(); return { rows: [] } }
    if (text.includes('WHERE "model" = $1 AND "id" = $2')) { this.rows.delete(key); return { rows: [] } }
    if (text.includes('WHERE "grantId" = $1')) { for (const [entryKey, row] of this.rows) if (row.grantId === values[0]) this.rows.delete(entryKey); return { rows: [] } }
    throw new Error(`Unexpected SQL in behavioral double: ${text}`)
  }
}

async function jarFetch(url: string, init: RequestInit, jar: string[]) {
  const headers = new Headers(init.headers)
  if (jar.length) headers.set("cookie", jar.join("; "))
  const response = await fetch(url, { ...init, headers, redirect: "manual" })
  const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
  for (const cookie of getSetCookie) { const pair = cookie.split(";", 1)[0]; const name = pair.split("=", 1)[0]; const index = jar.findIndex((item) => item.startsWith(`${name}=`)); if (index >= 0) jar[index] = pair; else jar.push(pair) }
  return response
}
