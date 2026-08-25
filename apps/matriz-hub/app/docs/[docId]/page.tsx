import Link from "next/link"
import { Button, Card, CardHeader, CardTitle, Heading, Stack, Text, Badge } from "@matriz/design-ui"
import { getDocsPageActorContext } from "../../../src/domains/docs/application/page-context"
import { makeDocsRepository } from "../../../src/domains/docs/integration/prisma/docs-repository"
import {
  BlockList,
  ContextGrid,
  DocsHeader,
  DocsNav,
  DocsUnavailable,
  RelationList,
  SuggestionList,
  TimelineList,
} from "../../../src/domains/docs/presentation/components"
import { docsToneForSensitivity, docsToneForStatus, toDocsDocumentVM } from "../../../src/domains/docs/presentation/presenters"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ docId: string }>
}

export default async function DocDetailPage({ params }: Props) {
  try {
    const { docId } = await params
    const detail = await makeDocsRepository().getDocument(await getDocsPageActorContext(), docId)
    if (!detail) return <DocsUnavailable error={new Error("Documento nao encontrado")} />
    const vm = toDocsDocumentVM(detail)
    return (
      <Stack gap={6}>
        <DocsHeader
          title={detail.title}
          description={detail.summary ?? detail.description ?? "Documento vivo da Matriz."}
          action={
            <>
              <Link href={`/docs/${detail.id}/edit`} className="no-underline"><Button>Editar</Button></Link>
              <Link href={`/docs/${detail.id}/versions`} className="no-underline"><Button variant="secondary">Versoes</Button></Link>
              <Link href={`/docs/${detail.id}/timeline`} className="no-underline"><Button variant="secondary">Timeline</Button></Link>
            </>
          }
        />
        <DocsNav />
        <div className="flex flex-wrap gap-2">
          <Badge tone={docsToneForStatus(detail.status)}>{detail.status}</Badge>
          <Badge tone="neutral">{detail.type}</Badge>
          <Badge tone="neutral">{detail.visibility}</Badge>
          <Badge tone={docsToneForSensitivity(detail.sensitivity)}>{detail.sensitivity}</Badge>
          {detail.currentVersion ? <Badge tone="brand">v{detail.currentVersion.versionNumber}</Badge> : null}
          {vm.canExportPublic ? <Badge tone="success">export publico seguro</Badge> : <Badge tone="warning">export publico requer revisao</Badge>}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Conteudo canonico</CardTitle></CardHeader>
            <BlockList blocks={detail.blocks} />
          </Card>
          <Stack gap={4}>
            <Card>
              <CardHeader><CardTitle>Inteligencia lateral</CardTitle></CardHeader>
              <Stack gap={2}>
                <Text size="sm"><strong>Entidades:</strong> {detail.entities.length}</Text>
                <Text size="sm"><strong>Relacoes:</strong> {detail.relations.length}</Text>
                <Text size="sm"><strong>Sugestoes:</strong> {detail.suggestions.length}</Text>
                <Text size="sm"><strong>Contextos:</strong> {detail.contextPackages.length}</Text>
                <Text size="sm"><strong>MCP URI:</strong> <code>{`matriz://docs/${detail.id}`}</code></Text>
              </Stack>
            </Card>
            <Card>
              <CardHeader><CardTitle>Sugestoes</CardTitle></CardHeader>
              <SuggestionList suggestions={detail.suggestions.slice(0, 4)} />
            </Card>
          </Stack>
        </div>
        <Card>
          <CardHeader><CardTitle>Context packages que usam este documento</CardTitle></CardHeader>
          <ContextGrid contexts={detail.contextPackages} />
        </Card>
        <Card>
          <CardHeader><CardTitle>Relacoes do grafo</CardTitle></CardHeader>
          <RelationList relations={detail.relations} />
        </Card>
        <Card>
          <CardHeader><CardTitle>Timeline recente</CardTitle></CardHeader>
          <TimelineList timeline={detail.timeline.slice(0, 5)} />
        </Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
