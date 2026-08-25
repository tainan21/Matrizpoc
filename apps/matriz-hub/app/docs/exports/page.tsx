import { Button, Card, CardHeader, CardTitle, Stack, Text, Badge } from "@matriz/design-ui"
import { getDocsPageActorContext } from "../../../src/domains/docs/application/page-context"
import { makeDocsRepository } from "../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable, DocumentGrid, ContextGrid } from "../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

export default async function ExportsPage() {
  try {
    const actor = await getDocsPageActorContext()
    const repo = makeDocsRepository()
    const [exports, docs, contexts] = await Promise.all([
      repo.listExports(actor),
      repo.listDocuments(actor),
      repo.listContextPackages(actor),
    ])
    return (
      <Stack gap={6}>
        <DocsHeader title="Exports" description="Gera Markdown/JSON a partir do canonico, com origem, versao, hash e auditoria." />
        <DocsNav />
        <Card>
          <CardHeader><CardTitle>Gerar export</CardTitle></CardHeader>
          <form action="/api/docs/exports" method="post" className="grid gap-3 sm:grid-cols-2">
            <select name="targetType" className="rounded-md border border-border p-3" defaultValue="document"><option value="document">document</option><option value="context_package">context_package</option></select>
            <input name="targetId" className="rounded-md border border-border p-3" placeholder="target id" required />
            <select name="exportType" className="rounded-md border border-border p-3" defaultValue="markdown"><option value="markdown">markdown</option><option value="json">json</option><option value="pdf">pdf-prepared</option></select>
            <Button type="submit">Gerar</Button>
          </form>
        </Card>
        <Card>
          <CardHeader><CardTitle>Artifacts</CardTitle></CardHeader>
          <Stack gap={2}>
            {exports.length === 0 ? <Text tone="muted">Nenhum export gerado.</Text> : exports.map((artifact) => (
              <div key={artifact.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap gap-2"><Badge tone="brand">{artifact.exportType}</Badge><Badge tone="neutral">{artifact.status}</Badge><Badge tone="neutral">{artifact.contentHash.slice(0, 10)}</Badge></div>
                <Text size="sm" className="mt-2">{artifact.storageKey ?? "sem storageKey"}</Text>
              </div>
            ))}
          </Stack>
        </Card>
        <Card><CardHeader><CardTitle>Documentos</CardTitle></CardHeader><DocumentGrid documents={docs} /></Card>
        <Card><CardHeader><CardTitle>Contextos</CardTitle></CardHeader><ContextGrid contexts={contexts} /></Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
