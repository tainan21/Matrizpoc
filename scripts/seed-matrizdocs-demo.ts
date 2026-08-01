/**
 * MatrizDocs V1 demo seed.
 *
 * Prereqs:
 *   pnpm exec prisma db push --schema prisma/schemas/hub.prisma
 *
 * Run:
 *   pnpm demo:docs
 *
 * The seed uses MatrizDocs use cases/repositories instead of raw inserts for
 * the living-document flow: import -> blocks -> entities -> suggestions ->
 * context package -> MCP read -> timeline/export.
 */
import { getHubDb } from "../packages/platform/db/src/hub"
import { defaultDocsActorContext } from "../apps/matriz-hub/src/domains/docs/application/access"
import { makeDocsRepository } from "../apps/matriz-hub/src/domains/docs/integration/prisma/docs-repository"

const tenantId = process.env.MATRIZ_DOCS_DEMO_TENANT_ID ?? "tenant_demo"
const actor = {
  ...defaultDocsActorContext,
  tenantId,
  actorId: "tai-demo",
  actorType: "human_user" as const,
  displayName: "Tai Demo",
}

async function main() {
  const db = getHubDb()
  const repo = makeDocsRepository(db)

  const existingDoc = await db.docDocument.findFirst({
    where: { tenantId, slug: "livro-do-novo-socio-demo" },
  })

  const document = existingDoc
    ? await repo.getDocument(actor, existingDoc.id)
    : await repo.importDocument(actor, {
        title: "Livro do Novo Socio Demo",
        content: [
          "# Livro do Novo Socio",
          "",
          "A MatrizDocs transforma informacao da Matriz em conhecimento vivo, versionado, conectado, pesquisavel, auditavel e acionavel.",
          "",
          "Definicao: Context Package e um pacote versionado de documentos, blocos e relacoes para uma audiencia.",
          "",
          "Regra: Convites devem referenciar a versao publicada do documento usado no onboarding.",
          "",
          "Decisao: MCP e Chat consomem MatrizDocs por resources e tools, sem acessar o banco diretamente.",
          "",
          "Task: Criar checklist de leitura para novo socio.",
          "",
          "Governance: Revisar documentos sensiveis antes de export publico.",
          "",
          "Risco: documentos antigos podem continuar sendo usados por convites se o contexto nao ficar outdated.",
        ].join("\n"),
        type: "onboarding",
        visibility: "internal",
        sensitivity: "normal",
        sourceKind: "seed",
        originalFileName: "seed-matrizdocs-demo.ts",
      })

  if (!document) throw new Error("Failed to load or create MatrizDocs demo document")

  const publishedDocument =
    document.status === "published"
      ? document
      : await repo.publishDocumentVersion(actor, document.id)

  const matrizDocsNode = await repo.createKnowledgeNode(actor, {
    type: "module",
    name: "MatrizDocs",
    description: "Memoria viva operacional da Matriz.",
    canonicalRefType: "document",
    canonicalRefId: publishedDocument.id,
  })
  const hubNode = await repo.createKnowledgeNode(actor, {
    type: "module",
    name: "MatrizHub",
    description: "Control plane institucional do ecossistema Matriz.",
  })
  await repo.createKnowledgeNode(actor, { type: "module", name: "MatrizWallet" })
  await repo.createKnowledgeNode(actor, { type: "module", name: "MatrizMCP" })
  await repo.createKnowledgeNode(actor, { type: "module", name: "Governanca" })
  await repo.createKnowledgeNode(actor, { type: "module", name: "Seumei" })
  await repo.createKnowledgeNode(actor, { type: "module", name: "Spot" })

  const existingEdge = await db.knowledgeEdge.findFirst({
    where: {
      tenantId,
      sourceNodeId: matrizDocsNode.id,
      targetNodeId: hubNode.id,
      relationType: "belongs_to",
    },
  })
  if (!existingEdge) {
    await repo.createKnowledgeEdge(actor, {
      sourceNodeId: matrizDocsNode.id,
      targetNodeId: hubNode.id,
      relationType: "belongs_to",
      status: "approved",
      confidence: 0.95,
      evidence: { source: "demo_seed", documentId: publishedDocument.id },
    })
  }

  const taskSuggestion = await repo.createSuggestion(actor, {
    type: "task",
    title: "Checklist de leitura do novo socio",
    description: "Criar task candidate a partir do bloco de onboarding.",
    targetType: "document",
    targetId: publishedDocument.id,
    confidence: 0.78,
    evidence: { source: "demo_seed", documentId: publishedDocument.id },
  })
  await repo.reviewSuggestion(actor, taskSuggestion.id, "accepted")

  const governanceSuggestion = await repo.createSuggestion(actor, {
    type: "governance",
    title: "Revisao de export publico",
    description: "Garantir aprovacao humana antes de publicar conteudo sensivel.",
    targetType: "document",
    targetId: publishedDocument.id,
    confidence: 0.82,
    evidence: { source: "demo_seed", documentId: publishedDocument.id },
  })
  await repo.reviewSuggestion(actor, governanceSuggestion.id, "accepted")

  const existingContext = await db.docContextPackage.findFirst({
    where: { tenantId, slug: "novo-socio-demo" },
  })
  const context = existingContext
    ? await repo.getContextPackage(actor, existingContext.id)
    : await repo.createContextPackage(actor, {
        title: "Novo Socio Demo",
        slug: "novo-socio-demo",
        description: "Pacote de leitura versionado para onboarding de socios.",
        audience: "new_partner",
        visibility: "internal",
        documentIds: [publishedDocument.id],
      })
  if (!context) throw new Error("Failed to load or create MatrizDocs demo context")

  const publishedContext =
    context.status === "published"
      ? context
      : await repo.publishContextPackage(actor, context.id)

  await repo.generateExport(actor, {
    targetType: "document",
    targetId: publishedDocument.id,
    exportType: "markdown",
    visibility: "internal",
  })
  await repo.generateExport(actor, {
    targetType: "context_package",
    targetId: publishedContext.id,
    exportType: "json",
    visibility: "internal",
  })
  await repo.readContextForMcp(
    { ...actor, actorId: "matriz-mcp-demo", actorType: "mcp_server" },
    publishedContext.slug,
  )

  const dashboard = await repo.getDashboard(actor)
  console.log(
    JSON.stringify(
      {
        ok: true,
        tenantId,
        document: {
          id: publishedDocument.id,
          title: publishedDocument.title,
          status: publishedDocument.status,
          blocks: publishedDocument.blocks.length,
        },
        context: {
          id: publishedContext.id,
          slug: publishedContext.slug,
          status: publishedContext.status,
          mcpUri: publishedContext.mcpUri,
        },
        dashboard: dashboard.stats,
      },
      null,
      2,
    ),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await getHubDb().$disconnect()
  })
