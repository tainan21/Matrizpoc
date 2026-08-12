import { Button, Card, CardHeader, CardTitle, Stack, Text, Badge } from "@matriz/design-ui"
import { getDocsPageActorContext } from "../../../../src/domains/docs/application/page-context"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable } from "../../../../src/domains/docs/presentation/components"
import { docsToneForStatus } from "../../../../src/domains/docs/presentation/presenters"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ contextId: string }>
}

export default async function ContextDetailPage({ params }: Props) {
  try {
    const { contextId } = await params
    const context = await makeDocsRepository().getContextPackage(await getDocsPageActorContext(), contextId)
    if (!context) return <DocsUnavailable error={new Error("Context package nao encontrado")} />
    return (
      <Stack gap={6}>
        <DocsHeader title={context.title} description={context.summary ?? context.description ?? "Pacote de contexto versionado."} />
        <DocsNav />
        <Card>
          <div className="flex flex-wrap gap-2">
            <Badge tone={docsToneForStatus(context.status)}>{context.status}</Badge>
            <Badge tone="brand">v{context.version}</Badge>
            <Badge tone="neutral">{context.audience}</Badge>
            <Badge tone="neutral">{context.visibility}</Badge>
          </div>
          <Text className="mt-3"><strong>MCP URI:</strong> <code>{context.mcpUri ?? `matriz://context/${context.slug}`}</code></Text>
          <form action={`/api/docs/context-packages/${context.id}/publish`} method="post" className="mt-4">
            <Button type="submit">Publicar / atualizar MCP</Button>
          </form>
        </Card>
        <Card>
          <CardHeader><CardTitle>Itens do pacote</CardTitle></CardHeader>
          {context.items.length === 0 ? <Text tone="muted">Nenhum item ainda.</Text> : (
            <Stack gap={2}>
              {context.items.map((item) => (
                <Text key={item.id} size="sm">{`${item.order + 1}. ${item.label ?? item.documentId} ${item.required ? "(obrigatorio)" : ""}`}</Text>
              ))}
            </Stack>
          )}
        </Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
