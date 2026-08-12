import { createServer } from "node:http"

import { loadIdentityEnvironment } from "./config.js"
import { createIdentityProvider } from "./provider.js"
import { createInteractionHandler, type IdentityAuthenticator } from "./interactions.js"
import { createCoreRateLimitStore } from "./rate-limit.js"
import { getIdentityDb } from "./persistence.js"

const environment = loadIdentityEnvironment(process.env)
const provider = await createIdentityProvider(environment)
const authenticatorModule = process.env.IDENTITY_AUTHENTICATOR_MODULE
if (!authenticatorModule) throw new Error("Missing IDENTITY_AUTHENTICATOR_MODULE")
const loaded = await import(authenticatorModule) as { authenticator?: IdentityAuthenticator }
if (!loaded.authenticator) throw new Error("IDENTITY_AUTHENTICATOR_MODULE must export authenticator")
const interactions = createInteractionHandler({ provider, authenticator: loaded.authenticator, rateLimits: createCoreRateLimitStore(getIdentityDb()), trustProxy: environment.trustProxy, trustedProxyHops: environment.trustedProxyHops, issuer: environment.issuer, csrfSecret: environment.csrfSecret! })

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
