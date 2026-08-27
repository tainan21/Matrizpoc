import { Card, CardHeader, CardTitle, Stack, Text, Badge } from "@matriz/design-ui"
import { getDocsPageActorContext } from "../../../src/domains/docs/application/page-context"
import { makeDocsRepository } from "../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable } from "../../../src/domains/docs/presentation/components"
import { docsToneForStatus } from "../../../src/domains/docs/presentation/presenters"

export const dynamic = "force-dynamic"

export default async function TaskCandidatesPage() {
  try {
    const candidates = await makeDocsRepository().listTaskCandidates(await getDocsPageActorContext())
    return (
      <Stack gap={6}>
        <DocsHeader title="Task candidates" description="Fila de tarefas sugeridas por documentos. MatrizDocs nao cria Sprint final diretamente." />
        <DocsNav />
        <Stack gap={3}>
          {candidates.length === 0 ? <Card><Text tone="muted">Nenhuma task candidate ainda.</Text></Card> : candidates.map((candidate) => (
            <Card key={candidate.id}>
              <div className="flex flex-wrap gap-2"><Badge tone={docsToneForStatus(candidate.status)}>{candidate.status}</Badge><Badge tone="neutral">{candidate.documentId}</Badge></div>
              <CardHeader><CardTitle>{candidate.title}</CardTitle></CardHeader>
              <Text>{candidate.description}</Text>
            </Card>
          ))}
        </Stack>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
