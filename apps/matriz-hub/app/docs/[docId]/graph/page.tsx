import { Card, CardHeader, CardTitle, Stack } from "@matriz/design-ui"
import { getDocsPageActorContext } from "../../../../src/domains/docs/application/page-context"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable, EntityGrid, RelationList } from "../../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ docId: string }>
}

export default async function DocGraphPage({ params }: Props) {
  try {
    const { docId } = await params
    const detail = await makeDocsRepository().getDocument(await getDocsPageActorContext(), docId)
    if (!detail) return <DocsUnavailable error={new Error("Documento nao encontrado")} />
    return (
      <Stack gap={6}>
        <DocsHeader title="Grafo do documento" description={`Lista conectada de entidades e relacoes de ${detail.title}.`} />
        <DocsNav />
        <Card><CardHeader><CardTitle>Entidades mencionadas</CardTitle></CardHeader><EntityGrid entities={detail.entities} /></Card>
        <Card><CardHeader><CardTitle>Relacoes</CardTitle></CardHeader><RelationList relations={detail.relations} /></Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
