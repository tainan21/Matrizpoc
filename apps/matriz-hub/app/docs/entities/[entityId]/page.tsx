import { Card, CardHeader, CardTitle, Stack, Text, Badge } from "@matriz/design-ui"
import { defaultDocsActorContext } from "../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable, DocumentGrid, RelationList, TimelineList } from "../../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ entityId: string }>
}

export default async function EntityDetailPage({ params }: Props) {
  try {
    const { entityId } = await params
    const detail = await makeDocsRepository().getKnowledgeNode(defaultDocsActorContext, entityId)
    if (!detail) return <DocsUnavailable error={new Error("Entidade nao encontrada")} />
    return (
      <Stack gap={6}>
        <DocsHeader title={detail.node.name} description={detail.node.description ?? "Wikipedia operacional da Matriz."} />
        <DocsNav />
        <Card>
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">{detail.node.type}</Badge>
            <Badge tone="neutral">{detail.node.slug}</Badge>
            <Badge tone="neutral">{`matriz://graph/entity/${detail.node.id}`}</Badge>
          </div>
          <Text className="mt-3">{detail.node.description ?? "Sem definicao curada ainda."}</Text>
        </Card>
        <Card><CardHeader><CardTitle>Documentos relacionados</CardTitle></CardHeader><DocumentGrid documents={detail.docs} /></Card>
        <Card><CardHeader><CardTitle>Relacoes</CardTitle></CardHeader><RelationList relations={detail.edges} /></Card>
        <Card><CardHeader><CardTitle>Timeline</CardTitle></CardHeader><TimelineList timeline={detail.timeline} /></Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
