import Link from "next/link"
import { Button, Card, CardHeader, CardTitle, Heading, Stack, Text } from "@matriz/design-ui"
import { defaultDocsActorContext } from "../../src/domains/docs/application/access"
import { makeDocsRepository } from "../../src/domains/docs/integration/prisma/docs-repository"
import {
  ContextGrid,
  DocsHeader,
  DocsNav,
  DocsUnavailable,
  DocumentGrid,
  StatsGrid,
  SuggestionList,
  TimelineList,
} from "../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

export default async function DocsHomePage() {
  try {
    const dashboard = await makeDocsRepository().getDashboard(defaultDocsActorContext)
    return (
      <Stack gap={6}>
        <DocsHeader
          title="MatrizDocs"
          description="A memoria viva da Matriz: documentos versionados, blocos canonicos, entidades, sugestoes, contextos, MCP e timeline."
          action={
            <>
              <Link href="/docs/new" className="no-underline"><Button>Criar documento</Button></Link>
              <Link href="/docs/import" className="no-underline"><Button variant="secondary">Importar</Button></Link>
            </>
          }
        />
        <DocsNav />
        <StatsGrid
          stats={{
            "Documentos": dashboard.stats.totalDocuments,
            "Publicados": dashboard.stats.publishedDocuments,
            "Sugestoes": dashboard.stats.pendingSuggestions,
            "Contextos": dashboard.stats.contextPackages,
            "MCP resources": dashboard.stats.mcpResources,
          }}
        />
        <Card>
          <CardHeader>
            <CardTitle>Biblioteca viva</CardTitle>
          </CardHeader>
          <DocumentGrid documents={dashboard.documents} />
        </Card>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>Sugestoes pendentes</CardTitle></CardHeader>
            <SuggestionList suggestions={dashboard.suggestions.slice(0, 3)} />
          </Card>
          <Card>
            <CardHeader><CardTitle>Context packages</CardTitle></CardHeader>
            <ContextGrid contexts={dashboard.contexts.slice(0, 3)} />
          </Card>
          <Card>
            <CardHeader><CardTitle>Timeline recente</CardTitle></CardHeader>
            <TimelineList timeline={dashboard.timeline.slice(0, 3)} />
          </Card>
        </div>
        <Card>
          <Heading level={3}>Fluxo vivo da V1</Heading>
          <Text tone="muted">
            Documento entra, vira blocos, gera entidades e sugestoes, alimenta context packages, expõe MCP e volta para a timeline quando agentes consomem.
          </Text>
        </Card>
      </Stack>
    )
  } catch (error) {
    return <DocsUnavailable error={error} />
  }
}
