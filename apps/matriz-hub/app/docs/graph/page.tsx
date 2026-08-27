import { Card, CardHeader, CardTitle, Stack } from "@matriz/design-ui"
import { getDocsPageActorContext } from "../../../src/domains/docs/application/page-context"
import { makeDocsRepository } from "../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable, RelationList } from "../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

export default async function GlobalGraphPage() {
  try {
    const relations = await makeDocsRepository().listKnowledgeEdges(await getDocsPageActorContext())
    return (
      <Stack gap={6}>
        <DocsHeader title="Grafo global" description="V1 usa lista conectada com status, evidencia e aprovacao. Visual graph avancado fica futuro." />
        <DocsNav />
        <Card><CardHeader><CardTitle>Relacoes institucionais</CardTitle></CardHeader><RelationList relations={relations} /></Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
