import { Button, Card, CardHeader, CardTitle, Stack, Text, Badge } from "@matriz/design-ui"
import { getDocsPageActorContext } from "../../../../src/domains/docs/application/page-context"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable } from "../../../../src/domains/docs/presentation/components"
import { docsToneForStatus } from "../../../../src/domains/docs/presentation/presenters"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ docId: string }>
}

export default async function VersionsPage({ params }: Props) {
  try {
    const { docId } = await params
    const detail = await makeDocsRepository().getDocument(await getDocsPageActorContext(), docId)
    if (!detail) return <DocsUnavailable error={new Error("Documento nao encontrado")} />
    return (
      <Stack gap={6}>
        <DocsHeader title="Versoes" description={`Historico de versoes de ${detail.title}.`} />
        <DocsNav />
        <Card>
          <CardHeader><CardTitle>Versao atual</CardTitle></CardHeader>
          {detail.currentVersion ? (
            <Stack gap={2}>
              <div className="flex flex-wrap gap-2">
                <Badge tone={docsToneForStatus(detail.currentVersion.status)}>{detail.currentVersion.status}</Badge>
                <Badge tone="brand">v{detail.currentVersion.versionNumber}</Badge>
                <Badge tone="neutral">{detail.currentVersion.contentHash.slice(0, 10)}</Badge>
              </div>
              <Text>{detail.currentVersion.summary ?? "Sem resumo"}</Text>
              <Text tone="muted" size="sm">{`Criada por ${detail.currentVersion.createdByActorType}:${detail.currentVersion.createdByActorId}`}</Text>
              {detail.currentVersion.status !== "published" ? (
                <form action={`/api/docs/documents/${detail.id}/versions`} method="post">
                  <Button type="submit">Publicar versao atual</Button>
                </form>
              ) : null}
            </Stack>
          ) : (
            <Text tone="muted">Sem versao atual.</Text>
          )}
        </Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
