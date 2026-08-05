import { Card, CardHeader, CardTitle, Stack } from "@matriz/design-ui"
import { defaultDocsActorContext } from "../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable, TimelineList } from "../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

export default async function TimelinePage() {
  try {
    const timeline = await makeDocsRepository().listTimeline(defaultDocsActorContext)
    return (
      <Stack gap={6}>
        <DocsHeader title="Timeline global" description="Livro de bordo auditavel da memoria viva da Matriz." />
        <DocsNav />
        <Card><CardHeader><CardTitle>Eventos recentes</CardTitle></CardHeader><TimelineList timeline={timeline} /></Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
