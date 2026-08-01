import { Card, CardHeader, CardTitle, Stack, Text, Badge } from "@matriz/design-ui"
import { defaultDocsActorContext } from "../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable } from "../../../src/domains/docs/presentation/components"
import { docsToneForSensitivity, docsToneForStatus } from "../../../src/domains/docs/presentation/presenters"

export const dynamic = "force-dynamic"

export default async function GovernanceCandidatesPage() {
  try {
    const candidates = await makeDocsRepository().listGovernanceCandidates(defaultDocsActorContext)
    return (
      <Stack gap={6}>
        <DocsHeader title="Governance candidates" description="Documentos sensiveis viram candidatos para revisao institucional, sem aprovar nada automaticamente." />
        <DocsNav />
        <Stack gap={3}>
          {candidates.length === 0 ? <Card><Text tone="muted">Nenhuma governance candidate ainda.</Text></Card> : candidates.map((candidate) => (
            <Card key={candidate.id}>
              <div className="flex flex-wrap gap-2">
                <Badge tone={docsToneForStatus(candidate.status)}>{candidate.status}</Badge>
                <Badge tone={docsToneForSensitivity(candidate.sensitivity)}>{candidate.sensitivity}</Badge>
                <Badge tone="neutral">{candidate.documentId}</Badge>
              </div>
              <CardHeader><CardTitle>{candidate.reason}</CardTitle></CardHeader>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(candidate.evidence, null, 2)}</pre>
            </Card>
          ))}
        </Stack>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
