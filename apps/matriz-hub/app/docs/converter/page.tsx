import { Button, Card, CardHeader, CardTitle, Stack, Text } from "@matriz/design-ui"
import { defaultDocsActorContext } from "../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable, DocumentGrid } from "../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

export default async function ConverterPage() {
  try {
    const docs = await makeDocsRepository().listDocuments(defaultDocsActorContext)
    return (
      <Stack gap={6}>
        <DocsHeader title="Conversor" description="Oficina de conversao, reprocessamento e indexacao preparada para busca semantica." />
        <DocsNav />
        <Card>
          <CardHeader><CardTitle>Documentos disponiveis para reprocessar</CardTitle></CardHeader>
          <DocumentGrid documents={docs} />
        </Card>
        <Card>
          <CardTitle>POST /api/docs/conversions</CardTitle>
          <Text tone="muted">Use a API com `documentId` para provar o pipeline de conversao preparado. Importacoes ja geram conversion run persistido.</Text>
          <form action="/api/docs/conversions" method="post" className="mt-4 flex gap-2">
            <input name="documentId" className="w-full rounded-md border border-border p-3" placeholder="doc id" />
            <Button type="submit">Reprocessar</Button>
          </form>
        </Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
