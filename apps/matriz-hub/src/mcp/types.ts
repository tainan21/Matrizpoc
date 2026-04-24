/**
 * Minimal JSON-RPC 2.0 + MCP protocol types.
 *
 * We implement MCP manually instead of pulling @modelcontextprotocol/sdk so
 * the POC stays lean and runs in serverless Next.js route handlers. The wire
 * format follows the MCP spec (2024-11-05 rev).
 */
export type JsonRpcId = string | number | null

export type JsonRpcRequest = {
  jsonrpc: "2.0"
  id?: JsonRpcId
  method: string
  params?: Record<string, unknown>
}

export type JsonRpcResponse<T = unknown> =
  | { jsonrpc: "2.0"; id: JsonRpcId; result: T }
  | {
      jsonrpc: "2.0"
      id: JsonRpcId
      error: { code: number; message: string; data?: unknown }
    }

export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const

export const MCP_PROTOCOL_VERSION = "2024-11-05" as const
