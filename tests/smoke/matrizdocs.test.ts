import { describe, expect, it } from "vitest"
import { MATRIZ_EVENT_NAMES } from "@matriz/foundation-constants"
import { createEventBus } from "@matriz/integration-events"
import {
  MATRIZ_DOCS_CONTRACT_VERSION,
  contextPackageSchema,
  documentDetailSchema,
  suggestionSchema,
  timelineEventSchema,
} from "@matriz/integration-api-contracts/v1/docs"
import { manifest as hubManifest } from "@apps/matriz-hub/public-contract"

const now = "2026-04-24T12:00:00.000Z"

describe("smoke: matrizdocs contracts and control-plane surface", () => {
  it("publishes a v1 contract with document, context, suggestion and timeline DTOs", () => {
    expect(MATRIZ_DOCS_CONTRACT_VERSION).toBe("v1")

    const document = {
      id: "doc-1",
      tenantId: "tenant-demo",
      title: "Livro do Novo Socio",
      slug: "livro-do-novo-socio",
      description: "Contexto institucional para onboarding.",
      type: "onboarding",
      status: "published",
      visibility: "internal",
      sensitivity: "normal",
      currentVersionId: "ver-1",
      currentVersionNumber: 1,
      summary: "Documento canonico publicado.",
      createdAt: now,
      updatedAt: now,
      badges: ["published", "normal"],
      counters: { blocks: 1, suggestions: 1, relations: 0, contextPackages: 1 },
      currentVersion: {
        id: "ver-1",
        tenantId: "tenant-demo",
        documentId: "doc-1",
        versionNumber: 1,
        status: "published",
        titleSnapshot: "Livro do Novo Socio",
        contentHash: "hash-1",
        summary: "Documento canonico publicado.",
        aiSummary: null,
        changeReason: "Initial publish",
        createdByActorId: "tai",
        createdByActorType: "human_user",
        publishedAt: now,
        deprecatedAt: null,
        createdAt: now,
      },
      blocks: [
        {
          id: "block-1",
          tenantId: "tenant-demo",
          documentId: "doc-1",
          versionId: "ver-1",
          parentBlockId: null,
          order: 0,
          type: "mcp_context",
          content: { text: "Contexto vivo para agentes." },
          plainText: "Contexto vivo para agentes.",
          sensitivity: "normal",
          metadata: null,
        },
      ],
      entities: [],
      relations: [],
      suggestions: [],
      contextPackages: [],
      timeline: [],
    }

    expect(documentDetailSchema.safeParse(document).success).toBe(true)
    expect(
      contextPackageSchema.safeParse({
        id: "ctx-1",
        tenantId: "tenant-demo",
        slug: "novo-socio",
        title: "Novo Socio",
        description: "Pacote de leitura.",
        audience: "partner",
        status: "published",
        visibility: "internal",
        version: 1,
        summary: "Contexto publicado.",
        mcpUri: "matriz://context/novo-socio",
        lastPublishedAt: now,
        items: [
          {
            id: "item-1",
            documentId: "doc-1",
            versionId: "ver-1",
            blockId: null,
            order: 0,
            required: true,
            label: "Livro do Novo Socio",
          },
        ],
        createdAt: now,
        updatedAt: now,
      }).success,
    ).toBe(true)
    expect(
      suggestionSchema.safeParse({
        id: "sug-1",
        tenantId: "tenant-demo",
        type: "task",
        status: "suggested",
        title: "Criar task candidate",
        description: "Transformar bloco em trabalho operacional.",
        confidence: 0.72,
        evidence: { documentId: "doc-1" },
        targetType: "document",
        targetId: "doc-1",
        createdByActorId: "matrizdocs-system",
        reviewedByActorId: null,
        result: null,
        createdAt: now,
        updatedAt: now,
      }).success,
    ).toBe(true)
    expect(
      timelineEventSchema.safeParse({
        id: "evt-1",
        tenantId: "tenant-demo",
        name: "docs.mcp.read",
        version: "v1",
        sourceApp: "matriz-hub",
        actorId: "matriz-mcp",
        actorType: "mcp_server",
        targetType: "context_package",
        targetId: "ctx-1",
        occurredAt: now,
        payload: { uri: "matriz://context/novo-socio" },
        metadata: null,
      }).success,
    ).toBe(true)
  })

  it("registers MatrizDocs capabilities, route and event names", () => {
    expect(hubManifest.routes.map((route) => route.path)).toContain("/docs")
    expect(hubManifest.capabilities.map((capability) => capability.id)).toEqual(
      expect.arrayContaining([
        "docs.library",
        "docs.ingestion",
        "docs.contextPackages",
        "docs.mcpResources",
        "docs.timeline",
        "docs.suggestions",
      ]),
    )
    expect(MATRIZ_EVENT_NAMES).toEqual(
      expect.arrayContaining([
        "docs.document.created",
        "docs.context.published",
        "docs.mcp.read",
        "docs.taskCandidate.created",
        "docs.governanceCandidate.created",
      ]),
    )
  })

  it("delivers docs events through the v1 event bus", async () => {
    const bus = createEventBus()
    const received: string[] = []
    bus.on("docs.document.created", (event) => {
      received.push(event.payload.documentId)
    })
    bus.emit("docs.document.created", {
      sourceApp: "matriz-hub",
      tenantId: "tenant-demo",
      payload: {
        documentId: "doc-1",
        tenantId: "tenant-demo",
        title: "Livro vivo",
        type: "institutional",
        actorId: "tai",
        actorType: "human_user",
      },
    })
    await Promise.resolve()
    expect(received).toEqual(["doc-1"])
  })
})

describe("smoke: matrizdocs mcp registry", () => {
  it("exposes MatrizDocs tools through the Hub MCP list", async () => {
    const { handleMcpRequest } = await import("../../apps/matriz-hub/src/mcp/handler")
    const response = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    })

    expect("result" in response).toBe(true)
    if ("result" in response) {
      const result = response.result as { tools: Array<{ name: string }> }
      expect(result.tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining([
          "search_docs",
          "read_doc",
          "read_context_package",
          "create_doc_suggestion",
          "generate_context_package",
          "propose_task_from_doc",
          "propose_governance_review_from_doc",
        ]),
      )
    }
  }, 15_000)
})
