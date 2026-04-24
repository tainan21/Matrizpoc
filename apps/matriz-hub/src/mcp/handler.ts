/**
 * MCP JSON-RPC 2.0 method dispatcher.
 *
 * Implements the subset of MCP required for V1.3 proof:
 *   - initialize
 *   - resources/list
 *   - resources/read
 *   - tools/list
 *   - tools/call
 *   - ping
 *
 * All other methods return METHOD_NOT_FOUND.
 */
import {
  JSON_RPC_ERRORS,
  MCP_PROTOCOL_VERSION,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "./types"
import { listResources, readResource } from "./resources"
import { MCP_TOOLS, callTool } from "./tools"

const SERVER_INFO = {
  name: "matriz-hub-mcp",
  version: "0.1.0",
} as const

const SERVER_CAPABILITIES = {
  resources: { subscribe: false, listChanged: false },
  tools: { listChanged: false },
  prompts: undefined,
  logging: {},
} as const

export async function handleMcpRequest(
  req: JsonRpcRequest,
): Promise<JsonRpcResponse> {
  const id = req.id ?? null

  if (req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: JSON_RPC_ERRORS.INVALID_REQUEST, message: "Invalid JSON-RPC request" },
    }
  }

  try {
    switch (req.method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            serverInfo: SERVER_INFO,
            capabilities: SERVER_CAPABILITIES,
          },
        }

      case "ping":
        return { jsonrpc: "2.0", id, result: {} }

      case "resources/list": {
        const resources = await listResources()
        return { jsonrpc: "2.0", id, result: { resources } }
      }

      case "resources/read": {
        const uri = req.params?.uri
        if (typeof uri !== "string") {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: JSON_RPC_ERRORS.INVALID_PARAMS,
              message: "resources/read requires params.uri (string)",
            },
          }
        }
        const content = await readResource(uri)
        if (!content) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: JSON_RPC_ERRORS.INVALID_PARAMS,
              message: `Resource not found: ${uri}`,
            },
          }
        }
        return { jsonrpc: "2.0", id, result: { contents: [content] } }
      }

      case "tools/list":
        return { jsonrpc: "2.0", id, result: { tools: MCP_TOOLS } }

      case "tools/call": {
        const name = req.params?.name
        const args = (req.params?.arguments as Record<string, unknown> | undefined) ?? {}
        if (typeof name !== "string") {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: JSON_RPC_ERRORS.INVALID_PARAMS,
              message: "tools/call requires params.name (string)",
            },
          }
        }
        const result = await callTool(name, args)
        return { jsonrpc: "2.0", id, result }
      }

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: JSON_RPC_ERRORS.METHOD_NOT_FOUND,
            message: `Method not found: ${req.method}`,
          },
        }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: JSON_RPC_ERRORS.INTERNAL_ERROR,
        message: "Internal MCP server error",
        data: message,
      },
    }
  }
}
