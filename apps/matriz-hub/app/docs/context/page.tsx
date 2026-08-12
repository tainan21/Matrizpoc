import { Button, Card, CardDescription, CardHeader, CardTitle, Stack, Text } from "@matriz/design-ui"
import { getDocsPageActorContext } from "../../../src/domains/docs/application/page-context"
import { makeDocsRepository } from "../../../src/domains/docs/integration/prisma/docs-repository"
import { ContextGrid, DocsHeader, DocsNav, DocsUnavailable, DocumentGrid } from "../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

export default async function ContextPackagesPage() {
  try {
    const actor = await getDocsPageActorContext()
    const repo = makeDocsRepository()
    const [contexts, docs] = await Promise.all([
      repo.listContextPackages(actor),
      repo.listDocuments(actor),
    ])
    return (
      <Stack gap={6}>
        <DocsHeader title="Context packages" description="Livros vivos versionados: Novo Socio, Dev, Agente MCP, Wallet e Governanca." />
        <DocsNav />
        <Card>
          <CardHeader><CardTitle>Criar pacote</CardTitle><CardDescription>Informe IDs separados por virgula para incluir documentos.</CardDescription></CardHeader>
          <form action="/api/docs/context-packages" method="post">
            <Stack gap={3}>
              <input name="title" className="w-full rounded-md border border-border p-3" placeholder="Novo Socio" required />
              <input name="audience" className="w-full rounded-md border border-border p-3" placeholder="new-partner" defaultValue="new-partner" />
              <input name="description" className="w-full rounded-md border border-border p-3" placeholder="Pacote de leitura para entrada de socios." />
              <input name="documentIds" className="w-full rounded-md border border-border p-3" placeholder="doc_1, doc_2" />
              <Button type="submit">Criar context package</Button>
            </Stack>
          </form>
        </Card>
        <ContextGrid contexts={contexts} />
        <Card>
          <CardHeader><CardTitle>Documentos disponiveis</CardTitle></CardHeader>
          <Text tone="muted" size="sm" className="mb-3">Use os IDs abaixo para montar pacotes enquanto a UI avancada de selecao fica para iteracao futura.</Text>
          <DocumentGrid documents={docs} />
        </Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
