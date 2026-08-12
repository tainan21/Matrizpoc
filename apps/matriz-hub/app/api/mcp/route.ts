/**
 * MCP JSON-RPC 2.0 endpoint for the Matriz Hub.
 *
 * Clients POST a JSON-RPC envelope; response is the envelope result.
 * GET returns a small advertisement payload so it's easy to discover.
 */
import { handleMcpRequest } from "../../../src/mcp/handler"
import { MCP_PROTOCOL_VERSION } from "../../../src/mcp/types"
import type { JsonRpcRequest } from "../../../src/mcp/types"
import { allowHubRequest, getHubRequestContext, requireSameOrigin, HubAuthError } from "../../../src/auth/hub-session"
import { readBoundedText, RequestBodyTooLargeError } from "../../../src/http/bounded-body"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  return Response.json({
    protocolVersion: MCP_PROTOCOL_VERSION,
    serverName: "matriz-hub-mcp",
    version: "0.1.0",
    transport: "http+json-rpc",
    methods: [
      "initialize",
      "ping",
      "resources/list",
      "resources/read",
      "tools/list",
      "tools/call",
    ],
    docs: "POST a JSON-RPC 2.0 envelope to this same URL.",
  }, { headers: { "cache-control": "public, max-age=300" } })
}

export async function POST(request: Request) {
  let principal
  try {
    requireSameOrigin(request)
    const context = getHubRequestContext(request)
    if (!allowHubRequest(context.session.identity.user.id)) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "Rate limit exceeded" } }, { status: 429, headers: { "cache-control": "private, no-store" } })
    principal = { docsActor: { tenantId: context.session.activeTenantId, actorId: context.session.identity.user.id, actorType: "human_user" as const, displayName: context.session.identity.user.name }, userId: context.session.identity.user.id, tenantId: context.session.activeTenantId }
  } catch (error) {
    const status = error instanceof HubAuthError ? error.status : 401
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "Authentication required" } }, { status, headers: { "cache-control": "private, no-store" } })
  }
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } }, { status: 415, headers: { "cache-control": "private, no-store" } })
  let body: unknown
  try {
    body = JSON.parse(await readBoundedText(request, 64 * 1024))
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Request too large" } }, { status: 413, headers: { "cache-control": "private, no-store" } })
    return Response.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      },
      { status: 400, headers: { "cache-control": "private, no-store" } },
    )
  }

  if (Array.isArray(body)) {
    if (body.length === 0 || body.length > 10) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } }, { status: 400, headers: { "cache-control": "private, no-store" } })
    const responses = await Promise.all(
      body.map((r) => handleMcpRequest(r as JsonRpcRequest, principal)),
    )
    return Response.json(responses, { headers: { "cache-control": "private, no-store" } })
  }

  const response = await handleMcpRequest(body as JsonRpcRequest, principal)
  return Response.json(response, { headers: { "cache-control": "private, no-store" } })
}
