import { Card, CardHeader, CardTitle, Stack } from "@matriz/design-ui"
import { getDocsPageActorContext } from "../../../src/domains/docs/application/page-context"
import { makeDocsRepository } from "../../../src/domains/docs/integration/prisma/docs-repository"
import { ContextGrid, DocsHeader, DocsNav, DocsUnavailable, SuggestionList } from "../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

export default async function ReviewDeskPage() {
  try {
    const actor = await getDocsPageActorContext()
    const repo = makeDocsRepository()
    const [suggestions, contexts] = await Promise.all([
      repo.listSuggestions(actor, "suggested"),
      repo.listContextPackages(actor),
    ])
    return (
      <Stack gap={6}>
        <DocsHeader title="Review Desk" description="Mesa do Tai: o que precisa de atencao agora." />
        <DocsNav />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardHeader><CardTitle>Sugestoes e aprovacoes</CardTitle></CardHeader><SuggestionList suggestions={suggestions} /></Card>
          <Card><CardHeader><CardTitle>Contextos desatualizados</CardTitle></CardHeader><ContextGrid contexts={contexts.filter((c) => c.status === "outdated")} /></Card>
        </div>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
