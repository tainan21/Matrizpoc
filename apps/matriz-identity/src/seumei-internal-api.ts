import { timingSafeEqual } from "node:crypto"
import type { IncomingMessage, ServerResponse } from "node:http"

export interface SeumeiInternalAccess {
  invoke(action: string, input: unknown): Promise<unknown>
}

function secureEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > 64 * 1024) throw new Error("body_too_large")
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown
}

export function createSeumeiInternalApiHandler(options: {
  serviceToken: string
  access: SeumeiInternalAccess
}) {
  if (options.serviceToken.length < 32) throw new Error("IDENTITY_SEUMEI_SERVICE_TOKEN must contain at least 32 characters")
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const url = new URL(request.url ?? "/", "http://identity.internal")
    if (url.pathname !== "/api/internal/v1/seumei/access") return false
    if (request.method !== "POST") {
      response.writeHead(405, { "content-type": "application/json", allow: "POST" })
      response.end(JSON.stringify({ error: "method_not_allowed" }))
      return true
    }
    const authorization = request.headers.authorization
    const appId = request.headers["x-matriz-app-id"]
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : ""
    if (appId !== "seumei" || !secureEqual(token, options.serviceToken)) {
      response.writeHead(401, { "content-type": "application/json" })
      response.end(JSON.stringify({ error: "unauthorized_service" }))
      return true
    }
    try {
      const body = await readJson(request) as { action?: unknown; input?: unknown }
      if (typeof body.action !== "string") throw new Error("invalid_request")
      const result = await options.access.invoke(body.action, body.input)
      response.writeHead(200, { "content-type": "application/json" })
      response.end(JSON.stringify({ result }))
    } catch (error) {
      const known = error instanceof Error && ["invalid_request", "unknown_action"].includes(error.message)
      response.writeHead(known ? 400 : 500, { "content-type": "application/json" })
      response.end(JSON.stringify({ error: known ? error.message : "internal_error" }))
    }
    return true
  }
}
