import { Card, CardHeader, CardTitle, Stack } from "@matriz/design-ui"
import { defaultDocsActorContext } from "../../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable, TimelineList } from "../../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ docId: string }>
}

export default async function DocTimelinePage({ params }: Props) {
  try {
    const { docId } = await params
    const timeline = await makeDocsRepository().listTimeline(defaultDocsActorContext, { targetType: "document", targetId: docId, limit: 100 })
    return (
      <Stack gap={6}>
        <DocsHeader title="Timeline do documento" description="Historico auditavel de criacao, conversao, sugestoes, MCP, exports e publicacoes." />
        <DocsNav />
        <Card><CardHeader><CardTitle>Eventos</CardTitle></CardHeader><TimelineList timeline={timeline} /></Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
