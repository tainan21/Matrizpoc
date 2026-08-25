import type { DocsActorContext } from "../domain/types"
import { makeDocsRepository } from "../integration/prisma/docs-repository"

export async function listDocsMcpResources(actor: DocsActorContext) {
  const repo = makeDocsRepository()
  const [docs, contexts, timeline, suggestions] = await Promise.all([
    repo.listDocuments(actor),
    repo.listContextPackages(actor),
    repo.listTimeline(actor, { limit: 1 }),
    repo.listSuggestions(actor, "suggested"),
  ])

  return [
    ...docs.map((doc) => ({
      uri: `matriz://docs/${doc.id}`,
      name: doc.title,
      description: `MatrizDocs document ${doc.title} (${doc.status}, ${doc.visibility}).`,
      mimeType: "application/json",
    })),
    ...docs
      .filter((doc) => doc.currentVersionId)
      .map((doc) => ({
        uri: `matriz://docs/${doc.id}/versions/${doc.currentVersionId}`,
        name: `${doc.title} current version`,
        description: `Current canonical version of ${doc.title}.`,
        mimeType: "application/json",
      })),
    ...contexts.map((context) => ({
      uri: context.mcpUri ?? `matriz://context/${context.slug}`,
      name: context.title,
      description: `Context package for ${context.audience}.`,
      mimeType: "application/json",
    })),
    {
      uri: "matriz://docs",
      name: "MatrizDocs library",
      description: "List of documents visible to the current actor.",
      mimeType: "application/json",
    },
    {
      uri: "matriz://timeline/latest",
      name: "MatrizDocs timeline latest",
      description: `${timeline.length} latest timeline event sample.`,
      mimeType: "application/json",
    },
    {
      uri: "matriz://suggestions/pending",
      name: "MatrizDocs pending suggestions",
      description: `${suggestions.length} pending suggestions.`,
      mimeType: "application/json",
    },
  ]
}

export async function readDocsMcpResource(uri: string, actor: DocsActorContext) {
  const repo = makeDocsRepository()
  if (uri === "matriz://docs") {
    return { uri, mimeType: "application/json", text: JSON.stringify({ documents: await repo.listDocuments(actor) }, null, 2) }
  }
  if (uri === "matriz://timeline/latest") {
    return { uri, mimeType: "application/json", text: JSON.stringify({ timeline: await repo.listTimeline(actor, { limit: 25 }) }, null, 2) }
  }
  if (uri === "matriz://suggestions/pending") {
    return { uri, mimeType: "application/json", text: JSON.stringify({ suggestions: await repo.listSuggestions(actor, "suggested") }, null, 2) }
  }

  const docMatch = /^matriz:\/\/docs\/([^/]+)(?:\/versions\/([^/]+))?$/.exec(uri)
  if (docMatch) {
    const documentId = decodeURIComponent(docMatch[1]!)
    const payload = await repo.readDocForMcp(actor, documentId)
    if (!payload) return null
    return { uri, mimeType: "application/json", text: JSON.stringify(payload, null, 2) }
  }

  const contextMatch = /^matriz:\/\/context\/([^/]+)$/.exec(uri)
  if (contextMatch) {
    const contextId = decodeURIComponent(contextMatch[1]!)
    const payload = await repo.readContextForMcp(actor, contextId)
    if (!payload) return null
    return { uri, mimeType: "application/json", text: JSON.stringify(payload, null, 2) }
  }

  const entityMatch = /^matriz:\/\/graph\/entity\/([^/]+)$/.exec(uri)
  if (entityMatch) {
    const entityId = decodeURIComponent(entityMatch[1]!)
    const payload = await repo.getKnowledgeNode(actor, entityId)
    if (!payload) return null
    return { uri, mimeType: "application/json", text: JSON.stringify(payload, null, 2) }
  }

  return null
}
