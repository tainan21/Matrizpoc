/**
 * MCP JSON-RPC 2.0 endpoint for the Matriz Hub.
 *
 * Clients POST a JSON-RPC envelope; response is the envelope result.
 * GET returns a small advertisement payload so it's easy to discover.
 */
import { handleMcpRequest } from "../../../src/mcp/handler"
import { MCP_PROTOCOL_VERSION } from "../../../src/mcp/types"
import type { JsonRpcRequest } from "../../../src/mcp/types"

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
  })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      },
      { status: 400 },
    )
  }

  if (Array.isArray(body)) {
    const responses = await Promise.all(
      body.map((r) => handleMcpRequest(r as JsonRpcRequest)),
    )
    return Response.json(responses)
  }

  const response = await handleMcpRequest(body as JsonRpcRequest)
  return Response.json(response)
}
