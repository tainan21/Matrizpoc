import { Card, CardHeader, CardTitle, Stack } from "@matriz/design-ui"
import { defaultDocsActorContext } from "../../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable, SuggestionList } from "../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

export default async function SuggestionsPage() {
  try {
    const suggestions = await makeDocsRepository().listSuggestions(defaultDocsActorContext)
    return (
      <Stack gap={6}>
        <DocsHeader title="Inbox de sugestoes" description="Toda sugestao precisa de evidencia. IA e agentes nunca aplicam verdade institucional sozinhos." />
        <DocsNav />
        <Card><CardHeader><CardTitle>Sugestoes</CardTitle></CardHeader><SuggestionList suggestions={suggestions} /></Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
