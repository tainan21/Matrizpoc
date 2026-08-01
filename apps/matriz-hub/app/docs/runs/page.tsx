import { Card, CardHeader, CardTitle, Stack, Text, Badge } from "@matriz/design-ui"
import { defaultDocsActorContext } from "../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable } from "../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

export default async function RunsPage() {
  try {
    const runs = await makeDocsRepository().listRuns(defaultDocsActorContext)
    return (
      <Stack gap={6}>
        <DocsHeader title="Runs" description="Conversoes, reindexacoes e execucoes de atores/agentes ficam auditaveis." />
        <DocsNav />
        <Card>
          <CardHeader><CardTitle>Conversion runs</CardTitle></CardHeader>
          <Stack gap={2}>
            {runs.conversionRuns.length === 0 ? <Text tone="muted">Nenhuma conversao ainda.</Text> : runs.conversionRuns.map((run) => (
              <div key={run.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap gap-2"><Badge tone="brand">{run.runType}</Badge><Badge tone="neutral">{run.status}</Badge><Badge tone="neutral">{run.documentId}</Badge></div>
                <Text size="sm" tone="muted">{new Date(run.startedAt).toLocaleString("pt-BR")}</Text>
              </div>
            ))}
          </Stack>
        </Card>
        <Card>
          <CardHeader><CardTitle>Actor runs</CardTitle></CardHeader>
          <Stack gap={2}>
            {runs.actorRuns.length === 0 ? <Text tone="muted">Nenhum actor run ainda.</Text> : runs.actorRuns.map((run) => (
              <div key={run.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap gap-2"><Badge tone="brand">{run.actorType}</Badge><Badge tone="neutral">{run.runType}</Badge><Badge tone="neutral">{run.status}</Badge></div>
              </div>
            ))}
          </Stack>
        </Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
