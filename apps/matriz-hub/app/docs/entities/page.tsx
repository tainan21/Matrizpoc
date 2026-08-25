import { Button, Card, CardHeader, CardTitle, Stack } from "@matriz/design-ui"
import { getDocsPageActorContext } from "../../../src/domains/docs/application/page-context"
import { makeDocsRepository } from "../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable, EntityGrid } from "../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

export default async function EntitiesPage() {
  try {
    const entities = await makeDocsRepository().listKnowledgeNodes(await getDocsPageActorContext())
    return (
      <Stack gap={6}>
        <DocsHeader title="Entidades" description="Catalogo institucional de conceitos, modulos, pessoas-papel e recursos da Matriz." />
        <DocsNav />
        <Card>
          <CardHeader><CardTitle>Criar entidade</CardTitle></CardHeader>
          <form action="/api/docs/entities" method="post" className="grid gap-3 sm:grid-cols-2">
            <input name="name" className="rounded-md border border-border p-3" placeholder="MatrizWallet" required />
            <input name="type" className="rounded-md border border-border p-3" placeholder="module" defaultValue="concept" />
            <input name="description" className="rounded-md border border-border p-3" placeholder="Definicao curta" />
            <Button type="submit">Criar</Button>
          </form>
        </Card>
        <EntityGrid entities={entities} />
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
