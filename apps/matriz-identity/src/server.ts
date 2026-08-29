import { createServer } from "node:http"

import { loadIdentityEnvironment } from "./config.js"
import { createIdentityProvider } from "./provider.js"
import { createInteractionHandler, type IdentityAuthenticator } from "./interactions.js"
import { createCoreRateLimitStore } from "./rate-limit.js"
import { getIdentityDb } from "./persistence.js"
import { createAccessApiRepository, createAppSessionClientAuthenticator, createAppSessionVaultRepository, createInteractionMfaChallenge, createMfaRepository } from "./persistence.js"
import { createAccessApiHandler } from "./access-api.js"
import { createMfaApiHandler } from "./mfa-api.js"
import { createAppSessionVaultHandler } from "./app-session-vault.js"

const environment = loadIdentityEnvironment(process.env)
const provider = await createIdentityProvider(environment)
const authenticatorModule = process.env.IDENTITY_AUTHENTICATOR_MODULE
if (!authenticatorModule) throw new Error("Missing IDENTITY_AUTHENTICATOR_MODULE")
const loaded = await import(authenticatorModule) as { authenticator?: IdentityAuthenticator }
if (!loaded.authenticator) throw new Error("IDENTITY_AUTHENTICATOR_MODULE must export authenticator")
const mfaRepository = createMfaRepository(getIdentityDb())
const interactions = createInteractionHandler({ provider, authenticator: loaded.authenticator, mfaPolicy: mfaRepository, mfaChallenge: createInteractionMfaChallenge(environment.mfaEncryptionKey, getIdentityDb()), rateLimits: createCoreRateLimitStore(getIdentityDb()), trustProxy: environment.trustProxy, trustedProxyHops: environment.trustedProxyHops, issuer: environment.issuer, csrfSecret: environment.csrfSecret! })
const accessApi = createAccessApiHandler({ issuer: environment.issuer, csrfSecret: environment.csrfSecret!, rateLimits: createCoreRateLimitStore(getIdentityDb()), access: createAccessApiRepository(getIdentityDb()), tokens: {
  async verify(token) { const value = await provider.AccessToken.find(token); return value?.accountId && value.clientId ? { userId: value.accountId, clientId: value.clientId, sessionId: value.grantId ?? value.jti ?? "unknown", authTime: value.authTime ?? value.auth_time, acr: value.acr, amr: value.amr } : null },
  async issue(claims) {
    const grant = new provider.Grant({ accountId: String(claims.sub), clientId: String(claims.client_id) })
    grant.addOIDCScope("openid profile email")
    const grantId = await grant.save()
    const accessToken = await new provider.AccessToken({ accountId: claims.sub, clientId: claims.client_id, grantId, scope: "openid profile email", ...claims }).save(900)
    return { accessToken }
  },
} })
const verifyMfaBearer = async (token: string) => { const value = await provider.AccessToken.find(token); return value?.accountId && value.clientId ? { userId: value.accountId, clientId: value.clientId, sessionId: value.grantId ?? value.jti ?? "unknown", authTime: value.authTime ?? value.auth_time, acr: value.acr, amr: value.amr } : null }
const mfaApi = createMfaApiHandler({ encryptionKey: environment.mfaEncryptionKey, repository: mfaRepository, tokens: {
  verify: verifyMfaBearer,
  async issueStepUp(identity) {
    const authTime = Math.floor(Date.now() / 1000)
    if (!identity.clientId) throw new Error("MFA token is missing client binding")
    const grant = new provider.Grant({ accountId: identity.userId, clientId: identity.clientId })
    grant.addOIDCScope("openid profile email")
    const grantId = await grant.save()
    const accessToken = await new provider.AccessToken({ accountId: identity.userId, clientId: identity.clientId, grantId, scope: "openid profile email", authTime, auth_time: authTime, acr: "urn:matriz:loa:2", amr: [...new Set([...(identity.amr ?? []), "otp"])] }).save(900)
    return { accessToken }
  },
}, rateLimits: createCoreRateLimitStore(getIdentityDb()) })
const appSessionVault = createAppSessionVaultHandler({ encryptionKey: environment.mfaEncryptionKey, repository: createAppSessionVaultRepository(getIdentityDb()), authenticate: createAppSessionClientAuthenticator(getIdentityDb()) })

const server = createServer((request, response) => { void handleRequest(request, response).catch((error: unknown) => {
  if (response.headersSent) { response.destroy(); return }
  const status = error instanceof Error && error.message === "body too large" ? 413 : 500
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" })
  response.end(JSON.stringify({ error: status === 413 ? "request_too_large" : "internal_error" }))
}) })

async function handleRequest(request: Parameters<typeof interactions>[0], response: Parameters<typeof interactions>[1]) {
  response.setHeader("X-Content-Type-Options", "nosniff")
  response.setHeader("Referrer-Policy", "no-referrer")
  response.setHeader("Cache-Control", "no-store, private")
  if (request.url === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" })
    response.end(JSON.stringify({ status: "ok" }))
    return
  }
  if (await interactions(request, response)) return
  if (await accessApi(request, response)) return
  if (await mfaApi(request, response)) return
  if (await appSessionVault(request, response)) return
  provider.callback()(request, response)
}

server.listen(environment.port, "0.0.0.0")

function shutdown(): void {
  server.close((error) => {
    process.exitCode = error ? 1 : 0
  })
}
process.once("SIGTERM", shutdown)
process.once("SIGINT", shutdown)
