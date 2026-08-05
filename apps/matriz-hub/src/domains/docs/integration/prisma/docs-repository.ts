import { getHubDb, type HubPrismaClient } from "@matriz/platform-db/hub"
import type {
  ContextPackageDTO,
  DocDocumentStatus,
  DocDocumentType,
  DocSensitivity,
  DocVisibility,
  DocumentBlockDTO,
  DocumentDetailDTO,
  DocumentSummaryDTO,
  DocumentVersionDTO,
  KnowledgeEdgeDTO,
  KnowledgeNodeDTO,
  SuggestionDTO,
  TimelineEventDTO,
} from "@matriz/integration-api-contracts/v1/docs"
import type {
  CreateContextPackageInput,
  CreateDocumentInput,
  CreateKnowledgeEdgeInput,
  CreateKnowledgeNodeInput,
  CreateSuggestionInput,
  DocsActorContext,
  GenerateExportInput,
  ImportDocumentInput,
  UpdateDocumentDraftInput,
} from "../../domain/types"
import {
  extractEntityNames,
  hashContent,
  parseTextToBlocks,
  slugify,
  summarizeBlocks,
  type ParsedDocBlock,
} from "../converters/text-to-blocks"
import { assertTenantScoped, canReadDocsTarget } from "../../application/access"

type Db = HubPrismaClient

export class DocsPrismaRepository {
  constructor(private readonly db: Db = getHubDb()) {}

  async listDocuments(actor: DocsActorContext, opts: { query?: string; status?: string; type?: string } = {}): Promise<DocumentSummaryDTO[]> {
    const rows = await this.db.docDocument.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.type ? { type: opts.type } : {}),
        ...(opts.query
          ? {
              OR: [
                { title: { contains: opts.query, mode: "insensitive" } },
                { description: { contains: opts.query, mode: "insensitive" } },
                { blocks: { some: { plainText: { contains: opts.query, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      include: {
        currentVersion: true,
        _count: { select: { blocks: true, contextPackageItems: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    })
    return rows
      .filter((row) => canReadDocsTarget({ visibility: row.visibility, sensitivity: row.sensitivity, actor }))
      .map((row) => toDocumentSummaryDTO(row))
  }

  async getDocument(actor: DocsActorContext, documentId: string): Promise<DocumentDetailDTO | null> {
    const row = await this.db.docDocument.findFirst({
      where: { id: documentId, tenantId: actor.tenantId },
      include: {
        currentVersion: true,
        blocks: { orderBy: { sortOrder: "asc" } },
        versions: { orderBy: { versionNumber: "desc" } },
        entityMentions: { include: { node: true } },
        contextPackageItems: { include: { contextPackage: { include: { items: true } } } },
      },
    })
    if (!row) return null
    assertTenantScoped(row, actor)
    if (!canReadDocsTarget({ visibility: row.visibility, sensitivity: row.sensitivity, actor })) {
      throw new Error("Actor is not authorized to read this document")
    }

    const nodes = uniqueBy(row.entityMentions.map((m) => m.node), (n) => n.id)
    const nodeIds = nodes.map((n) => n.id)
    const [edges, suggestions, timeline] = await Promise.all([
      nodeIds.length > 0
        ? this.db.knowledgeEdge.findMany({
            where: {
              tenantId: actor.tenantId,
              OR: [{ sourceNodeId: { in: nodeIds } }, { targetNodeId: { in: nodeIds } }],
            },
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),
      this.db.docSuggestion.findMany({
        where: { tenantId: actor.tenantId, targetId: documentId },
        orderBy: { updatedAt: "desc" },
      }),
      this.listTimeline(actor, { targetType: "document", targetId: documentId, limit: 40 }),
    ])

    return {
      ...toDocumentSummaryDTO(row),
      currentVersion: row.currentVersion ? toVersionDTO(row.currentVersion) : null,
      blocks: row.blocks.map(toBlockDTO),
      entities: nodes.map(toKnowledgeNodeDTO),
      relations: edges.map(toKnowledgeEdgeDTO),
      suggestions: suggestions.map(toSuggestionDTO),
      contextPackages: uniqueBy(row.contextPackageItems.map((i) => i.contextPackage), (p) => p.id).map(toContextPackageDTO),
      timeline,
    }
  }

  async createDocument(actor: DocsActorContext, input: CreateDocumentInput): Promise<DocumentDetailDTO> {
    const type = input.type ?? "institutional"
    const status = input.status ?? "draft"
    const visibility = input.visibility ?? "internal"
    const parsed = parseTextToBlocks(input.content)
    const sensitivity = input.sensitivity ?? deriveDocumentSensitivity(parsed)
    const baseSlug = slugify(input.title)
    const slug = await this.uniqueDocumentSlug(actor.tenantId, baseSlug)
    const contentHash = hashContent(input.content)
    const summary = summarizeBlocks(parsed)

    const document = await this.db.docDocument.create({
      data: {
        tenantId: actor.tenantId,
        projectId: input.projectId,
        title: input.title,
        slug,
        description: input.description,
        type,
        status,
        visibility,
        sensitivity,
        createdByActorId: actor.actorId,
        createdByActorType: actor.actorType,
        metadata: (input.metadata ?? {}) as never,
      },
    })

    const version = await this.db.docDocumentVersion.create({
      data: {
        tenantId: actor.tenantId,
        documentId: document.id,
        versionNumber: 1,
        status,
        titleSnapshot: input.title,
        contentHash,
        summary,
        aiSummary: summary,
        changeReason: "Initial MatrizDocs V1 version",
        createdByActorId: actor.actorId,
        createdByActorType: actor.actorType,
        metadata: { source: "manual" } as never,
      },
    })

    await this.db.docDocument.update({
      where: { id: document.id },
      data: { currentVersionId: version.id },
    })

    const blocks = await this.createBlocks(actor, document.id, version.id, parsed)
    await this.createChunks(actor, document.id, version.id, blocks)
    await this.detectEntities(actor, document.id, version.id, blocks)
    await this.createAutomaticSuggestions(actor, document.id, blocks)
    await this.recordTimeline(actor, {
      name: "docs.document.created",
      targetType: "document",
      targetId: document.id,
      payload: { title: input.title, type, visibility, sensitivity },
    })
    await this.recordTimeline(actor, {
      name: "docs.document.version.created",
      targetType: "document",
      targetId: document.id,
      payload: { versionId: version.id, versionNumber: 1 },
    })

    const detail = await this.getDocument(actor, document.id)
    if (!detail) throw new Error("Failed to load created document")
    return detail
  }

  async importDocument(actor: DocsActorContext, input: ImportDocumentInput): Promise<DocumentDetailDTO> {
    const detail = await this.createDocument(actor, {
      ...input,
      status: input.status ?? "raw",
      metadata: { ...(input.metadata ?? {}), imported: true, sourceKind: input.sourceKind ?? "pasted_text" },
    })
    const artifact = await this.db.docSourceArtifact.create({
      data: {
        tenantId: actor.tenantId,
        documentId: detail.id,
        versionId: detail.currentVersionId ?? undefined,
        artifactType: "source",
        originalFileName: input.originalFileName,
        mimeType: input.mimeType ?? "text/plain",
        storageKey: `local://matrizdocs/${actor.tenantId}/${detail.id}/source.txt`,
        sizeBytes: input.content.length,
        checksum: hashContent(input.content),
        sourceKind: input.sourceKind ?? "pasted_text",
        metadata: { textPreview: input.content.slice(0, 500) } as never,
      },
    })
    const run = await this.db.docConversionRun.create({
      data: {
        tenantId: actor.tenantId,
        documentId: detail.id,
        sourceArtifactId: artifact.id,
        status: "completed",
        runType: "import_and_convert",
        startedAt: new Date(),
        completedAt: new Date(),
        actorId: actor.actorId,
        actorType: actor.actorType,
        logs: [{ message: "Original preserved and converted into canonical blocks." }] as never,
        result: { blockCount: detail.blocks.length, sourceArtifactId: artifact.id } as never,
      },
    })
    await this.recordTimeline(actor, {
      name: "docs.document.imported",
      targetType: "document",
      targetId: detail.id,
      payload: { sourceKind: input.sourceKind ?? "pasted_text", sourceArtifactId: artifact.id },
    })
    await this.recordTimeline(actor, {
      name: "docs.document.converted",
      targetType: "document",
      targetId: detail.id,
      payload: { runId: run.id, blockCount: detail.blocks.length },
    })
    const refreshed = await this.getDocument(actor, detail.id)
    return refreshed ?? detail
  }

  async updateDocumentDraft(actor: DocsActorContext, input: UpdateDocumentDraftInput): Promise<DocumentDetailDTO> {
    const doc = await this.db.docDocument.findFirst({ where: { id: input.documentId, tenantId: actor.tenantId }, include: { versions: true } })
    if (!doc) throw new Error("Document not found")
    assertTenantScoped(doc, actor)
    const nextVersionNumber = Math.max(0, ...doc.versions.map((v) => v.versionNumber)) + 1
    const parsed = parseTextToBlocks(input.content)
    const version = await this.db.docDocumentVersion.create({
      data: {
        tenantId: actor.tenantId,
        documentId: doc.id,
        versionNumber: nextVersionNumber,
        status: "draft",
        titleSnapshot: input.title ?? doc.title,
        contentHash: hashContent(input.content),
        summary: summarizeBlocks(parsed),
        aiSummary: summarizeBlocks(parsed),
        changeReason: input.changeReason ?? "Draft update",
        createdByActorId: actor.actorId,
        createdByActorType: actor.actorType,
      },
    })
    await this.db.docDocument.update({
      where: { id: doc.id },
      data: {
        title: input.title ?? doc.title,
        status: "draft",
        currentVersionId: version.id,
        sensitivity: deriveDocumentSensitivity(parsed),
      },
    })
    const blocks = await this.createBlocks(actor, doc.id, version.id, parsed)
    await this.createChunks(actor, doc.id, version.id, blocks)
    await this.detectEntities(actor, doc.id, version.id, blocks)
    await this.markContextsOutdatedForDocument(actor, doc.id)
    await this.recordTimeline(actor, {
      name: "docs.document.version.created",
      targetType: "document",
      targetId: doc.id,
      payload: { versionId: version.id, versionNumber: nextVersionNumber },
    })
    const detail = await this.getDocument(actor, doc.id)
    if (!detail) throw new Error("Failed to load updated document")
    return detail
  }

  async publishDocumentVersion(actor: DocsActorContext, documentId: string): Promise<DocumentDetailDTO> {
    const doc = await this.db.docDocument.findFirst({ where: { id: documentId, tenantId: actor.tenantId } })
    if (!doc) throw new Error("Document not found")
    assertTenantScoped(doc, actor)
    if (!doc.currentVersionId) throw new Error("Document has no current version")
    const now = new Date()
    const version = await this.db.docDocumentVersion.update({
      where: { id: doc.currentVersionId },
      data: { status: "published", publishedAt: now },
    })
    await this.db.docDocument.update({ where: { id: doc.id }, data: { status: "published" } })
    await this.markContextsOutdatedForDocument(actor, doc.id)
    await this.recordTimeline(actor, {
      name: "docs.document.version.published",
      targetType: "document",
      targetId: doc.id,
      payload: { versionId: version.id, versionNumber: version.versionNumber },
    })
    const detail = await this.getDocument(actor, doc.id)
    if (!detail) throw new Error("Failed to load published document")
    return detail
  }

  async createKnowledgeNode(actor: DocsActorContext, input: CreateKnowledgeNodeInput): Promise<KnowledgeNodeDTO> {
    const slug = slugify(input.name)
    const node = await this.db.knowledgeNode.upsert({
      where: { tenantId_slug: { tenantId: actor.tenantId, slug } },
      create: {
        tenantId: actor.tenantId,
        type: input.type,
        name: input.name,
        slug,
        description: input.description,
        canonicalRefType: input.canonicalRefType,
        canonicalRefId: input.canonicalRefId,
      },
      update: {
        type: input.type,
        description: input.description,
        canonicalRefType: input.canonicalRefType,
        canonicalRefId: input.canonicalRefId,
      },
    })
    await this.recordTimeline(actor, {
      name: "docs.entity.created",
      targetType: "entity",
      targetId: node.id,
      payload: { name: node.name, type: node.type },
    })
    return toKnowledgeNodeDTO(node)
  }

  async listKnowledgeNodes(actor: DocsActorContext): Promise<KnowledgeNodeDTO[]> {
    const rows = await this.db.knowledgeNode.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    })
    return rows.map(toKnowledgeNodeDTO)
  }

  async getKnowledgeNode(actor: DocsActorContext, nodeId: string): Promise<{ node: KnowledgeNodeDTO; docs: DocumentSummaryDTO[]; edges: KnowledgeEdgeDTO[]; timeline: TimelineEventDTO[] } | null> {
    const node = await this.db.knowledgeNode.findFirst({
      where: { id: nodeId, tenantId: actor.tenantId },
      include: {
        entityMentions: { include: { document: { include: { currentVersion: true, _count: { select: { blocks: true, contextPackageItems: true } } } } } },
      },
    })
    if (!node) return null
    const edges = await this.db.knowledgeEdge.findMany({
      where: { tenantId: actor.tenantId, OR: [{ sourceNodeId: nodeId }, { targetNodeId: nodeId }] },
      orderBy: { updatedAt: "desc" },
    })
    return {
      node: toKnowledgeNodeDTO(node),
      docs: uniqueBy(node.entityMentions.map((m) => m.document), (d) => d.id).map(toDocumentSummaryDTO),
      edges: edges.map(toKnowledgeEdgeDTO),
      timeline: await this.listTimeline(actor, { targetType: "entity", targetId: nodeId, limit: 25 }),
    }
  }

  async createKnowledgeEdge(actor: DocsActorContext, input: CreateKnowledgeEdgeInput): Promise<KnowledgeEdgeDTO> {
    const edge = await this.db.knowledgeEdge.create({
      data: {
        tenantId: actor.tenantId,
        sourceNodeId: input.sourceNodeId,
        targetNodeId: input.targetNodeId,
        relationType: input.relationType,
        status: input.status ?? "suggested",
        confidence: input.confidence ?? null,
        evidence: (input.evidence ?? { source: "manual" }) as never,
        createdByActorId: actor.actorId,
        createdByActorType: actor.actorType,
        approvedByActorId: input.status === "approved" ? actor.actorId : null,
      },
    })
    await this.recordTimeline(actor, {
      name: input.status === "approved" ? "docs.relation.approved" : "docs.relation.suggested",
      targetType: "relation",
      targetId: edge.id,
      payload: { sourceNodeId: edge.sourceNodeId, targetNodeId: edge.targetNodeId, relationType: edge.relationType },
    })
    return toKnowledgeEdgeDTO(edge)
  }

  async listKnowledgeEdges(actor: DocsActorContext): Promise<KnowledgeEdgeDTO[]> {
    const rows = await this.db.knowledgeEdge.findMany({ where: { tenantId: actor.tenantId }, orderBy: { updatedAt: "desc" } })
    return rows.map(toKnowledgeEdgeDTO)
  }

  async createSuggestion(actor: DocsActorContext, input: CreateSuggestionInput): Promise<SuggestionDTO> {
    const suggestion = await this.db.docSuggestion.create({
      data: {
        tenantId: actor.tenantId,
        type: input.type,
        status: "suggested",
        title: input.title,
        description: input.description,
        confidence: input.confidence ?? null,
        evidence: (input.evidence ?? {}) as never,
        targetType: input.targetType,
        targetId: input.targetId,
        createdByActorId: actor.actorId,
        createdByActorType: actor.actorType,
      },
    })
    await this.recordTimeline(actor, {
      name: "docs.suggestion.created",
      targetType: "suggestion",
      targetId: suggestion.id,
      payload: { type: suggestion.type, targetType: suggestion.targetType, targetId: suggestion.targetId },
    })
    return toSuggestionDTO(suggestion)
  }

  async listSuggestions(actor: DocsActorContext, status?: string): Promise<SuggestionDTO[]> {
    const rows = await this.db.docSuggestion.findMany({
      where: { tenantId: actor.tenantId, ...(status ? { status } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 100,
    })
    return rows.map(toSuggestionDTO)
  }

  async reviewSuggestion(actor: DocsActorContext, suggestionId: string, status: "accepted" | "rejected"): Promise<SuggestionDTO> {
    const suggestion = await this.db.docSuggestion.update({
      where: { id: suggestionId },
      data: {
        status,
        reviewedByActorId: actor.actorId,
        reviewedByActorType: actor.actorType,
        result: { reviewedAt: new Date().toISOString(), status } as never,
      },
    })
    assertTenantScoped(suggestion, actor)
    await this.recordTimeline(actor, {
      name: status === "accepted" ? "docs.suggestion.accepted" : "docs.suggestion.rejected",
      targetType: "suggestion",
      targetId: suggestion.id,
      payload: { type: suggestion.type, status },
    })
    if (status === "accepted" && suggestion.type === "task" && suggestion.targetType === "document") {
      await this.createTaskCandidate(actor, suggestion.targetId, suggestion.title, suggestion.description, suggestion.evidence as Record<string, unknown>)
    }
    if (status === "accepted" && suggestion.type === "governance" && suggestion.targetType === "document") {
      await this.createGovernanceCandidate(actor, suggestion.targetId, suggestion.description, "sensitive", suggestion.evidence as Record<string, unknown>)
    }
    return toSuggestionDTO(suggestion)
  }

  async createContextPackage(actor: DocsActorContext, input: CreateContextPackageInput): Promise<ContextPackageDTO> {
    const slug = await this.uniqueContextSlug(actor.tenantId, slugify(input.slug ?? input.title))
    const context = await this.db.docContextPackage.create({
      data: {
        tenantId: actor.tenantId,
        slug,
        title: input.title,
        description: input.description,
        audience: input.audience ?? "internal",
        status: "draft",
        visibility: input.visibility ?? "internal",
        version: 1,
        summary: input.description ?? `Pacote de contexto ${input.title}.`,
        mcpUri: `matriz://context/${slug}`,
      },
    })
    let order = 0
    for (const documentId of input.documentIds ?? []) {
      const doc = await this.db.docDocument.findFirst({ where: { id: documentId, tenantId: actor.tenantId } })
      if (!doc) continue
      await this.db.docContextPackageItem.create({
        data: {
          tenantId: actor.tenantId,
          contextPackageId: context.id,
          documentId,
          versionId: doc.currentVersionId,
          sortOrder: order++,
          required: order === 1,
          label: doc.title,
        },
      })
    }
    await this.recordTimeline(actor, {
      name: "docs.context.created",
      targetType: "context_package",
      targetId: context.id,
      payload: { slug: context.slug, title: context.title },
    })
    const loaded = await this.getContextPackage(actor, context.id)
    if (!loaded) throw new Error("Failed to load context package")
    return loaded
  }

  async listContextPackages(actor: DocsActorContext): Promise<ContextPackageDTO[]> {
    const rows = await this.db.docContextPackage.findMany({
      where: { tenantId: actor.tenantId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { updatedAt: "desc" },
    })
    return rows.map(toContextPackageDTO)
  }

  async getContextPackage(actor: DocsActorContext, idOrSlug: string): Promise<ContextPackageDTO | null> {
    const row = await this.db.docContextPackage.findFirst({
      where: {
        tenantId: actor.tenantId,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    })
    return row ? toContextPackageDTO(row) : null
  }

  async publishContextPackage(actor: DocsActorContext, idOrSlug: string): Promise<ContextPackageDTO> {
    const row = await this.db.docContextPackage.findFirst({ where: { tenantId: actor.tenantId, OR: [{ id: idOrSlug }, { slug: idOrSlug }] } })
    if (!row) throw new Error("Context package not found")
    assertTenantScoped(row, actor)
    const published = await this.db.docContextPackage.update({
      where: { id: row.id },
      data: {
        status: "published",
        version: row.version + 1,
        lastPublishedAt: new Date(),
        mcpUri: row.mcpUri ?? `matriz://context/${row.slug}`,
      },
    })
    await this.refreshMcpSnapshot(actor, {
      uri: published.mcpUri ?? `matriz://context/${published.slug}`,
      resourceType: "context",
      targetType: "context_package",
      targetId: published.id,
      version: published.version,
      payload: await this.buildContextPayload(actor, published.id),
    })
    await this.recordTimeline(actor, {
      name: "docs.context.published",
      targetType: "context_package",
      targetId: published.id,
      payload: { version: published.version, mcpUri: published.mcpUri },
    })
    const loaded = await this.getContextPackage(actor, published.id)
    if (!loaded) throw new Error("Failed to load published context")
    return loaded
  }

  async readContextForMcp(actor: DocsActorContext, idOrSlug: string): Promise<Record<string, unknown> | null> {
    const context = await this.getContextPackage(actor, idOrSlug)
    if (!context) return null
    if (!canReadDocsTarget({ visibility: context.visibility, sensitivity: "normal", actor })) {
      throw new Error("Actor is not authorized to read this context package")
    }
    const payload = await this.buildContextPayload(actor, context.id)
    await this.recordMcpRead(actor, context.mcpUri ?? `matriz://context/${context.slug}`, "context_package", context.id)
    return payload
  }

  async readDocForMcp(actor: DocsActorContext, documentId: string): Promise<Record<string, unknown> | null> {
    const doc = await this.getDocument(actor, documentId)
    if (!doc) return null
    await this.recordMcpRead(actor, `matriz://docs/${doc.id}`, "document", doc.id)
    return {
      document: doc,
      canonicalBlocks: doc.blocks,
      warning: doc.sensitivity === "normal" ? undefined : "Sensitive document; only authorized actors should receive this payload.",
    }
  }

  async recordMcpRead(actor: DocsActorContext, uri: string, targetType: string, targetId: string): Promise<void> {
    await this.db.docMcpResourceSnapshot.upsert({
      where: { tenantId_uri: { tenantId: actor.tenantId, uri } },
      create: {
        tenantId: actor.tenantId,
        uri,
        resourceType: targetType === "context_package" ? "context" : "doc",
        targetType,
        targetId,
        version: 1,
        contentHash: hashContent(uri),
        payload: { uri, targetType, targetId } as never,
        lastGeneratedAt: new Date(),
        lastReadAt: new Date(),
      },
      update: { lastReadAt: new Date() },
    })
    await this.recordTimeline(actor, {
      name: "docs.mcp.read",
      targetType,
      targetId,
      payload: { uri },
    })
  }

  async listTimeline(actor: DocsActorContext, opts: { targetType?: string; targetId?: string; limit?: number } = {}): Promise<TimelineEventDTO[]> {
    const rows = await this.db.docTimelineEvent.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(opts.targetType ? { targetType: opts.targetType } : {}),
        ...(opts.targetId ? { targetId: opts.targetId } : {}),
      },
      orderBy: { occurredAt: "desc" },
      take: opts.limit ?? 100,
    })
    return rows.map(toTimelineEventDTO)
  }

  async listRuns(actor: DocsActorContext) {
    const [conversionRuns, actorRuns] = await Promise.all([
      this.db.docConversionRun.findMany({ where: { tenantId: actor.tenantId }, orderBy: { startedAt: "desc" }, take: 50 }),
      this.db.docActorRun.findMany({ where: { tenantId: actor.tenantId }, orderBy: { startedAt: "desc" }, take: 50 }),
    ])
    return { conversionRuns, actorRuns }
  }

  async generateExport(actor: DocsActorContext, input: GenerateExportInput) {
    if (input.targetType === "document") {
      const doc = await this.getDocument(actor, input.targetId)
      if (!doc) throw new Error("Document not found")
      if (input.visibility === "public" && doc.sensitivity !== "normal") {
        throw new Error("Public export blocked because document is sensitive")
      }
      const payload = input.exportType === "json" ? doc : renderDocumentMarkdown(doc)
      const artifact = await this.db.docExportArtifact.create({
        data: {
          tenantId: actor.tenantId,
          documentId: doc.id,
          versionId: doc.currentVersionId ?? undefined,
          exportType: input.exportType,
          storageKey: `local://matrizdocs/${actor.tenantId}/exports/${doc.id}.${input.exportType}`,
          contentHash: hashContent(typeof payload === "string" ? payload : JSON.stringify(payload)),
          status: "generated",
          generatedByActorId: actor.actorId,
          generatedByActorType: actor.actorType,
          generatedAt: new Date(),
          metadata: { payload } as never,
        },
      })
      await this.recordTimeline(actor, {
        name: "docs.export.generated",
        targetType: "document",
        targetId: doc.id,
        payload: { exportArtifactId: artifact.id, exportType: input.exportType },
      })
      return artifact
    }

    const context = await this.getContextPackage(actor, input.targetId)
    if (!context) throw new Error("Context package not found")
    const payload = input.exportType === "json" ? context : renderContextMarkdown(context)
    const artifact = await this.db.docExportArtifact.create({
      data: {
        tenantId: actor.tenantId,
        contextPackageId: context.id,
        exportType: input.exportType,
        storageKey: `local://matrizdocs/${actor.tenantId}/exports/context-${context.id}.${input.exportType}`,
        contentHash: hashContent(typeof payload === "string" ? payload : JSON.stringify(payload)),
        status: "generated",
        generatedByActorId: actor.actorId,
        generatedByActorType: actor.actorType,
        generatedAt: new Date(),
        metadata: { payload } as never,
      },
    })
    await this.recordTimeline(actor, {
      name: "docs.export.generated",
      targetType: "context_package",
      targetId: context.id,
      payload: { exportArtifactId: artifact.id, exportType: input.exportType },
    })
    return artifact
  }

  async listExports(actor: DocsActorContext) {
    return this.db.docExportArtifact.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { generatedAt: "desc" },
      take: 100,
    })
  }

  async listMcpResources(actor: DocsActorContext) {
    return this.db.docMcpResourceSnapshot.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { updatedAt: "desc" },
      take: 100,
    })
  }

  async getDashboard(actor: DocsActorContext) {
    const [documents, suggestions, contexts, timeline, mcpResources] = await Promise.all([
      this.listDocuments(actor),
      this.listSuggestions(actor, "suggested"),
      this.listContextPackages(actor),
      this.listTimeline(actor, { limit: 25 }),
      this.listMcpResources(actor),
    ])
    return {
      stats: {
        totalDocuments: documents.length,
        publishedDocuments: documents.filter((d) => d.status === "published").length,
        pendingSuggestions: suggestions.length,
        contextPackages: contexts.length,
        mcpResources: mcpResources.length,
      },
      documents,
      suggestions,
      contexts,
      timeline,
    }
  }

  async createTaskCandidate(actor: DocsActorContext, documentId: string, title: string, description: string, evidence: Record<string, unknown>) {
    const candidate = await this.db.docTaskCandidate.create({
      data: {
        tenantId: actor.tenantId,
        documentId,
        title,
        description,
        status: "suggested",
        evidence: evidence as never,
        createdByActorId: actor.actorId,
        createdByActorType: actor.actorType,
      },
    })
    await this.recordTimeline(actor, {
      name: "docs.taskCandidate.created",
      targetType: "task_candidate",
      targetId: candidate.id,
      payload: { documentId, title },
    })
    return candidate
  }

  async listTaskCandidates(actor: DocsActorContext) {
    return this.db.docTaskCandidate.findMany({ where: { tenantId: actor.tenantId }, orderBy: { updatedAt: "desc" } })
  }

  async createGovernanceCandidate(actor: DocsActorContext, documentId: string, reason: string, sensitivity: string, evidence: Record<string, unknown>) {
    const candidate = await this.db.docGovernanceCandidate.create({
      data: {
        tenantId: actor.tenantId,
        documentId,
        reason,
        sensitivity,
        status: "suggested",
        evidence: evidence as never,
        createdByActorId: actor.actorId,
        createdByActorType: actor.actorType,
      },
    })
    await this.recordTimeline(actor, {
      name: "docs.governanceCandidate.created",
      targetType: "governance_candidate",
      targetId: candidate.id,
      payload: { documentId, reason, sensitivity },
    })
    return candidate
  }

  async listGovernanceCandidates(actor: DocsActorContext) {
    return this.db.docGovernanceCandidate.findMany({ where: { tenantId: actor.tenantId }, orderBy: { updatedAt: "desc" } })
  }

  private async createBlocks(actor: DocsActorContext, documentId: string, versionId: string, parsed: readonly ParsedDocBlock[]) {
    const rows = []
    for (let i = 0; i < parsed.length; i++) {
      const block = parsed[i]!
      rows.push(
        await this.db.docBlock.create({
          data: {
            tenantId: actor.tenantId,
            documentId,
            versionId,
            sortOrder: i,
            type: block.type,
            content: block.content as never,
            plainText: block.plainText,
            sensitivity: block.sensitivity,
            metadata: { parser: "matrizdocs-v1" } as never,
          },
        }),
      )
    }
    return rows
  }

  private async createChunks(actor: DocsActorContext, documentId: string, versionId: string, blocks: readonly { id: string; plainText: string }[]) {
    for (const block of blocks) {
      if (!block.plainText.trim()) continue
      await this.db.docChunk.create({
        data: {
          tenantId: actor.tenantId,
          documentId,
          versionId,
          blockId: block.id,
          chunkText: block.plainText,
          tokenCount: Math.max(1, block.plainText.split(/\s+/).length),
          metadata: { semanticSearchPrepared: true } as never,
        },
      })
    }
  }

  private async detectEntities(actor: DocsActorContext, documentId: string, versionId: string, blocks: readonly { id: string; plainText: string }[]) {
    for (const block of blocks) {
      const names = extractEntityNames(block.plainText)
      for (const name of names) {
        const node = await this.createKnowledgeNode(actor, { type: inferEntityType(name), name: normalizeEntityName(name) })
        await this.db.docEntityMention.create({
          data: {
            tenantId: actor.tenantId,
            documentId,
            versionId,
            blockId: block.id,
            nodeId: node.id,
            mentionText: name,
            confidence: 0.82,
            status: "suggested",
            metadata: { detector: "keyword-hashtag-v1" } as never,
          },
        })
        await this.recordTimeline(actor, {
          name: "docs.entity.detected",
          targetType: "document",
          targetId: documentId,
          payload: { nodeId: node.id, blockId: block.id, mentionText: name, confidence: 0.82 },
        })
      }
    }
  }

  private async createAutomaticSuggestions(actor: DocsActorContext, documentId: string, blocks: readonly { id: string; type: string; plainText: string; sensitivity: string }[]) {
    for (const block of blocks) {
      const lower = block.plainText.toLowerCase()
      if (block.type === "task_candidate" || lower.includes("precisamos")) {
        await this.createSuggestion(actor, {
          type: "task",
          title: `Task candidate: ${block.plainText.slice(0, 80)}`,
          description: "Este bloco parece conter uma acao que pode alimentar Sprint.",
          targetType: "document",
          targetId: documentId,
          confidence: 0.72,
          evidence: { blockId: block.id, text: block.plainText },
        })
      }
      if (block.type === "governance_candidate" || block.sensitivity !== "normal") {
        await this.createSuggestion(actor, {
          type: "governance",
          title: `Revisao institucional: ${block.plainText.slice(0, 80)}`,
          description: "Este bloco menciona tema sensivel e pode precisar de governanca.",
          targetType: "document",
          targetId: documentId,
          confidence: 0.78,
          evidence: { blockId: block.id, text: block.plainText, sensitivity: block.sensitivity },
        })
      }
    }
  }

  private async markContextsOutdatedForDocument(actor: DocsActorContext, documentId: string) {
    const items = await this.db.docContextPackageItem.findMany({ where: { tenantId: actor.tenantId, documentId } })
    const contextIds = Array.from(new Set(items.map((i) => i.contextPackageId)))
    if (contextIds.length === 0) return
    await this.db.docContextPackage.updateMany({
      where: { tenantId: actor.tenantId, id: { in: contextIds }, status: "published" },
      data: { status: "outdated" },
    })
    for (const contextId of contextIds) {
      await this.recordTimeline(actor, {
        name: "docs.context.updated",
        targetType: "context_package",
        targetId: contextId,
        payload: { reason: "base_document_changed", documentId },
      })
    }
  }

  private async recordTimeline(actor: DocsActorContext, input: { name: string; targetType: string; targetId: string; payload: Record<string, unknown>; metadata?: Record<string, unknown> }) {
    return this.db.docTimelineEvent.create({
      data: {
        tenantId: actor.tenantId,
        name: input.name,
        version: "v1",
        sourceApp: "matriz-hub",
        actorId: actor.actorId,
        actorType: actor.actorType,
        targetType: input.targetType,
        targetId: input.targetId,
        occurredAt: new Date(),
        payload: input.payload as never,
        metadata: (input.metadata ?? {}) as never,
      },
    })
  }

  private async refreshMcpSnapshot(actor: DocsActorContext, input: { uri: string; resourceType: string; targetType: string; targetId: string; version: number; payload: Record<string, unknown> }) {
    const contentHash = hashContent(JSON.stringify(input.payload))
    await this.db.docMcpResourceSnapshot.upsert({
      where: { tenantId_uri: { tenantId: actor.tenantId, uri: input.uri } },
      create: {
        tenantId: actor.tenantId,
        uri: input.uri,
        resourceType: input.resourceType,
        targetType: input.targetType,
        targetId: input.targetId,
        version: input.version,
        contentHash,
        payload: input.payload as never,
        lastGeneratedAt: new Date(),
      },
      update: {
        version: input.version,
        contentHash,
        payload: input.payload as never,
        lastGeneratedAt: new Date(),
      },
    })
    await this.recordTimeline(actor, {
      name: "docs.mcp.refreshed",
      targetType: input.targetType,
      targetId: input.targetId,
      payload: { uri: input.uri, resourceType: input.resourceType },
    })
  }

  private async buildContextPayload(actor: DocsActorContext, contextPackageId: string): Promise<Record<string, unknown>> {
    const context = await this.db.docContextPackage.findFirst({
      where: { id: contextPackageId, tenantId: actor.tenantId },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: {
            document: { include: { currentVersion: true, blocks: { orderBy: { sortOrder: "asc" } } } },
          },
        },
      },
    })
    if (!context) throw new Error("Context package not found")
    return {
      id: context.id,
      slug: context.slug,
      title: context.title,
      audience: context.audience,
      version: context.version,
      summary: context.summary,
      documents: context.items.map((item) => ({
        id: item.document.id,
        title: item.document.title,
        versionId: item.versionId ?? item.document.currentVersionId,
        summary: item.document.currentVersion?.summary,
        required: item.required,
        blocks: item.document.blocks
          .filter((block) => block.sensitivity === "normal" || item.document.visibility !== "public")
          .map((block) => ({ type: block.type, text: block.plainText })),
      })),
    }
  }

  private async uniqueDocumentSlug(tenantId: string, baseSlug: string): Promise<string> {
    let slug = baseSlug
    let i = 2
    while (await this.db.docDocument.findUnique({ where: { tenantId_slug: { tenantId, slug } } })) {
      slug = `${baseSlug}-${i++}`
    }
    return slug
  }

  private async uniqueContextSlug(tenantId: string, baseSlug: string): Promise<string> {
    let slug = baseSlug
    let i = 2
    while (await this.db.docContextPackage.findUnique({ where: { tenantId_slug: { tenantId, slug } } })) {
      slug = `${baseSlug}-${i++}`
    }
    return slug
  }
}

export function makeDocsRepository(db: Db = getHubDb()) {
  return new DocsPrismaRepository(db)
}

function deriveDocumentSensitivity(blocks: readonly ParsedDocBlock[]): DocSensitivity {
  if (blocks.some((b) => b.sensitivity === "equity")) return "equity"
  if (blocks.some((b) => b.sensitivity === "financial")) return "financial"
  if (blocks.some((b) => b.sensitivity === "legal")) return "legal"
  if (blocks.some((b) => b.sensitivity === "sensitive")) return "sensitive"
  return "normal"
}

function inferEntityType(name: string): string {
  const normalized = normalizeEntityName(name).toLowerCase()
  if (["matrizhub", "matrizdocs", "matrizwallet", "matrizmcp", "seumei", "spot"].includes(normalized.replace(/\s+/g, ""))) return "module"
  if (normalized.includes("sócio") || normalized.includes("socio") || normalized.includes("investidor")) return "person_role"
  if (normalized.includes("govern")) return "governance"
  return "concept"
}

function normalizeEntityName(name: string): string {
  if (/^wallet$/i.test(name)) return "MatrizWallet"
  if (/^governanca$/i.test(name)) return "Governança"
  return name.replace(/[-_]+/g, " ").trim()
}

function uniqueBy<T, K extends string>(list: readonly T[], getKey: (item: T) => K): T[] {
  const seen = new Set<K>()
  const out: T[] = []
  for (const item of list) {
    const key = getKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function toDocumentSummaryDTO(row: {
  id: string
  tenantId: string
  projectId: string | null
  title: string
  slug: string
  description: string | null
  type: string
  status: string
  visibility: string
  sensitivity: string
  currentVersionId: string | null
  currentVersion?: { versionNumber: number; summary: string | null } | null
  createdAt: Date
  updatedAt: Date
  _count?: { blocks?: number; contextPackageItems?: number }
}): DocumentSummaryDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId ?? undefined,
    title: row.title,
    slug: row.slug,
    description: row.description ?? undefined,
    type: row.type as DocDocumentType,
    status: row.status as DocDocumentStatus,
    visibility: row.visibility as DocVisibility,
    sensitivity: row.sensitivity as DocSensitivity,
    currentVersionId: row.currentVersionId,
    currentVersionNumber: row.currentVersion?.versionNumber,
    summary: row.currentVersion?.summary ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    badges: [row.type, row.status, row.visibility, row.sensitivity].filter(Boolean),
    counters: {
      blocks: row._count?.blocks ?? 0,
      suggestions: 0,
      relations: 0,
      contextPackages: row._count?.contextPackageItems ?? 0,
    },
  }
}

function toVersionDTO(row: {
  id: string
  tenantId: string
  documentId: string
  versionNumber: number
  status: string
  titleSnapshot: string
  contentHash: string
  summary: string | null
  aiSummary: string | null
  changeReason: string | null
  createdByActorId: string
  createdByActorType: string
  publishedAt: Date | null
  deprecatedAt: Date | null
  createdAt: Date
}): DocumentVersionDTO {
  return {
    ...row,
    createdByActorType: row.createdByActorType as never,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    deprecatedAt: row.deprecatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

function toBlockDTO(row: {
  id: string
  tenantId: string
  documentId: string
  versionId: string
  parentBlockId: string | null
  sortOrder: number
  type: string
  content: unknown
  plainText: string
  sensitivity: string
  metadata: unknown
}): DocumentBlockDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    documentId: row.documentId,
    versionId: row.versionId,
    parentBlockId: row.parentBlockId,
    order: row.sortOrder,
    type: row.type as never,
    content: (row.content ?? {}) as Record<string, unknown>,
    plainText: row.plainText,
    sensitivity: row.sensitivity as never,
    metadata: (row.metadata ?? null) as Record<string, unknown> | null,
  }
}

function toKnowledgeNodeDTO(row: {
  id: string
  tenantId: string
  type: string
  name: string
  slug: string
  description: string | null
  canonicalRefType: string | null
  canonicalRefId: string | null
}): KnowledgeNodeDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    type: row.type,
    name: row.name,
    slug: row.slug,
    description: row.description,
    canonicalRefType: row.canonicalRefType,
    canonicalRefId: row.canonicalRefId,
  }
}

function toKnowledgeEdgeDTO(row: {
  id: string
  tenantId: string
  sourceNodeId: string
  targetNodeId: string
  relationType: string
  status: string
  confidence: number | null
  evidence: unknown
  createdByActorId: string
  approvedByActorId: string | null
}): KnowledgeEdgeDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    sourceNodeId: row.sourceNodeId,
    targetNodeId: row.targetNodeId,
    relationType: row.relationType as never,
    status: row.status as never,
    confidence: row.confidence,
    evidence: (row.evidence ?? {}) as Record<string, unknown>,
    createdByActorId: row.createdByActorId,
    approvedByActorId: row.approvedByActorId,
  }
}

function toSuggestionDTO(row: {
  id: string
  tenantId: string
  type: string
  status: string
  title: string
  description: string
  confidence: number | null
  evidence: unknown
  targetType: string
  targetId: string
  createdByActorId: string
  reviewedByActorId: string | null
  result: unknown
  createdAt: Date
  updatedAt: Date
}): SuggestionDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    type: row.type as never,
    status: row.status as never,
    title: row.title,
    description: row.description,
    confidence: row.confidence,
    evidence: (row.evidence ?? {}) as Record<string, unknown>,
    targetType: row.targetType,
    targetId: row.targetId,
    createdByActorId: row.createdByActorId,
    reviewedByActorId: row.reviewedByActorId,
    result: (row.result ?? null) as Record<string, unknown> | null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toContextPackageDTO(row: {
  id: string
  tenantId: string
  slug: string
  title: string
  description: string | null
  audience: string
  status: string
  visibility: string
  version: number
  summary: string | null
  mcpUri: string | null
  lastPublishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  items?: Array<{
    id: string
    documentId: string
    versionId: string | null
    blockId: string | null
    sortOrder: number
    required: boolean
    label: string | null
  }>
}): ContextPackageDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    slug: row.slug,
    title: row.title,
    description: row.description,
    audience: row.audience,
    status: row.status as never,
    visibility: row.visibility as never,
    version: row.version,
    summary: row.summary,
    mcpUri: row.mcpUri,
    lastPublishedAt: row.lastPublishedAt?.toISOString() ?? null,
    items: (row.items ?? []).map((item) => ({
      id: item.id,
      documentId: item.documentId,
      versionId: item.versionId,
      blockId: item.blockId,
      order: item.sortOrder,
      required: item.required,
      label: item.label,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toTimelineEventDTO(row: {
  id: string
  tenantId: string
  name: string
  version: string
  sourceApp: string
  actorId: string
  actorType: string
  targetType: string
  targetId: string
  occurredAt: Date
  payload: unknown
  metadata: unknown
}): TimelineEventDTO {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    version: "v1",
    sourceApp: row.sourceApp,
    actorId: row.actorId,
    actorType: row.actorType as never,
    targetType: row.targetType,
    targetId: row.targetId,
    occurredAt: row.occurredAt.toISOString(),
    payload: (row.payload ?? {}) as Record<string, unknown>,
    metadata: (row.metadata ?? null) as Record<string, unknown> | null,
  }
}

function renderDocumentMarkdown(doc: DocumentDetailDTO): string {
  return [
    `# ${doc.title}`,
    "",
    doc.summary ?? "",
    "",
    ...doc.blocks
      .filter((block) => block.sensitivity === "normal" || doc.visibility !== "public")
      .map((block) => (block.type === "heading" ? `## ${block.plainText}` : block.plainText)),
  ].join("\n")
}

function renderContextMarkdown(context: ContextPackageDTO): string {
  return [
    `# ${context.title}`,
    "",
    context.summary ?? context.description ?? "",
    "",
    ...context.items.map((item, index) => `${index + 1}. ${item.label ?? item.documentId}`),
  ].join("\n")
}
