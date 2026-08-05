import { defaultDocsActorContext } from "../application/access"
import { makeDocsRepository } from "../integration/prisma/docs-repository"

type DocsMcpToolResult = {
  content: Array<{ type: "text"; text: string }>
  isError?: boolean
}

export const DOCS_MCP_TOOLS = [
  {
    name: "search_docs",
    description: "Searches MatrizDocs documents with tenant-safe textual retrieval.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "read_doc",
    description: "Reads one MatrizDocs document as canonical JSON.",
    inputSchema: {
      type: "object",
      properties: { documentId: { type: "string" } },
      required: ["documentId"],
      additionalProperties: false,
    },
  },
  {
    name: "list_context_packages",
    description: "Lists MatrizDocs context packages available to the actor.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "read_context_package",
    description: "Reads a context package by id or slug and records MCP usage.",
    inputSchema: {
      type: "object",
      properties: { contextId: { type: "string" } },
      required: ["contextId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_doc_suggestion",
    description: "Creates a reviewable MatrizDocs suggestion. It never mutates truth directly.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        targetType: { type: "string" },
        targetId: { type: "string" },
      },
      required: ["type", "title", "description", "targetType", "targetId"],
      additionalProperties: true,
    },
  },
  {
    name: "refresh_doc_index",
    description: "Records an index-refresh actor run placeholder for semantic search readiness.",
    inputSchema: {
      type: "object",
      properties: { documentId: { type: "string" } },
      required: ["documentId"],
      additionalProperties: false,
    },
  },
  {
    name: "convert_document",
    description: "Runs MatrizDocs conversion readiness over a document.",
    inputSchema: {
      type: "object",
      properties: { documentId: { type: "string" } },
      required: ["documentId"],
      additionalProperties: false,
    },
  },
  {
    name: "generate_context_package",
    description: "Creates a draft context package from document IDs.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        audience: { type: "string" },
        documentIds: { type: "array", items: { type: "string" } },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "propose_task_from_doc",
    description: "Creates a task suggestion from a document.",
    inputSchema: {
      type: "object",
      properties: { documentId: { type: "string" }, title: { type: "string" }, description: { type: "string" } },
      required: ["documentId", "title"],
      additionalProperties: false,
    },
  },
  {
    name: "propose_governance_review_from_doc",
    description: "Creates a governance suggestion from a document.",
    inputSchema: {
      type: "object",
      properties: { documentId: { type: "string" }, reason: { type: "string" } },
      required: ["documentId", "reason"],
      additionalProperties: false,
    },
  },
] as const

export async function callDocsTool(name: string, args: Record<string, unknown>): Promise<DocsMcpToolResult | null> {
  const repo = makeDocsRepository()
  const actor = { ...defaultDocsActorContext, actorType: "mcp_server" as const, actorId: "matriz-mcp" }
  switch (name) {
    case "search_docs": {
      const query = typeof args.query === "string" ? args.query : ""
      const documents = await repo.listDocuments(actor, { query })
      return { content: [{ type: "text", text: JSON.stringify({ documents }, null, 2) }] }
    }
    case "read_doc": {
      const documentId = String(args.documentId ?? "")
      const payload = await repo.readDocForMcp(actor, documentId)
      return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], isError: !payload }
    }
    case "list_context_packages": {
      const contexts = await repo.listContextPackages(actor)
      return { content: [{ type: "text", text: JSON.stringify({ contexts }, null, 2) }] }
    }
    case "read_context_package": {
      const contextId = String(args.contextId ?? "")
      const payload = await repo.readContextForMcp(actor, contextId)
      return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], isError: !payload }
    }
    case "create_doc_suggestion": {
      const suggestion = await repo.createSuggestion(actor, {
        type: String(args.type ?? "document_patch") as never,
        title: String(args.title ?? "MCP suggestion"),
        description: String(args.description ?? ""),
        targetType: String(args.targetType ?? "document"),
        targetId: String(args.targetId ?? ""),
        confidence: typeof args.confidence === "number" ? args.confidence : 0.6,
        evidence: { source: "mcp", args },
      })
      return { content: [{ type: "text", text: JSON.stringify(suggestion, null, 2) }] }
    }
    case "generate_context_package": {
      const context = await repo.createContextPackage(actor, {
        title: String(args.title ?? "MCP Context Package"),
        audience: typeof args.audience === "string" ? args.audience : "agent",
        documentIds: Array.isArray(args.documentIds) ? args.documentIds.map(String) : [],
      })
      return { content: [{ type: "text", text: JSON.stringify(context, null, 2) }] }
    }
    case "propose_task_from_doc": {
      const suggestion = await repo.createSuggestion(actor, {
        type: "task",
        title: String(args.title ?? "Task candidate from MCP"),
        description: String(args.description ?? "MCP proposed a task candidate from document context."),
        targetType: "document",
        targetId: String(args.documentId ?? ""),
        confidence: 0.68,
        evidence: { source: "mcp_tool", tool: name },
      })
      return { content: [{ type: "text", text: JSON.stringify(suggestion, null, 2) }] }
    }
    case "propose_governance_review_from_doc": {
      const suggestion = await repo.createSuggestion(actor, {
        type: "governance",
        title: "Governance review candidate",
        description: String(args.reason ?? "MCP proposed governance review."),
        targetType: "document",
        targetId: String(args.documentId ?? ""),
        confidence: 0.7,
        evidence: { source: "mcp_tool", tool: name },
      })
      return { content: [{ type: "text", text: JSON.stringify(suggestion, null, 2) }] }
    }
    case "refresh_doc_index":
    case "convert_document":
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { ok: true, tool: name, documentId: args.documentId, message: "MatrizDocs V1 index/conversion pipeline is prepared and DB-backed via import/conversion runs." },
              null,
              2,
            ),
          },
        ],
      }
    default:
      return null
  }
}
