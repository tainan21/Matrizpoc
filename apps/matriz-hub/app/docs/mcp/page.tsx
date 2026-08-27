import { Card, CardHeader, CardTitle, Stack, Text, Badge } from "@matriz/design-ui"
import { DOCS_MCP_TOOLS } from "../../../src/domains/docs/mcp/tools"
import { getDocsPageActorContext } from "../../../src/domains/docs/application/page-context"
import { makeDocsRepository } from "../../../src/domains/docs/integration/prisma/docs-repository"
import { DocsHeader, DocsNav, DocsUnavailable } from "../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

export default async function McpPage() {
  try {
    const resources = await makeDocsRepository().listMcpResources(await getDocsPageActorContext())
    return (
      <Stack gap={6}>
        <DocsHeader title="MCP MatrizDocs" description="Painel de recursos e tools para agentes. Toda leitura deve gerar timeline." />
        <DocsNav />
        <Card>
          <CardHeader><CardTitle>Tools</CardTitle></CardHeader>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DOCS_MCP_TOOLS.map((tool) => (
              <Card key={tool.name}>
                <Badge tone="brand">{tool.name}</Badge>
                <Text size="sm" className="mt-2">{tool.description}</Text>
              </Card>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader><CardTitle>Resource snapshots</CardTitle></CardHeader>
          <Stack gap={2}>
            {resources.length === 0 ? <Text tone="muted">Nenhum snapshot ainda. Publique um context package ou leia via MCP.</Text> : resources.map((resource) => (
              <div key={resource.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap gap-2"><Badge tone="brand">{resource.resourceType}</Badge><Badge tone="neutral">v{resource.version}</Badge><Badge tone="neutral">{resource.contentHash.slice(0, 10)}</Badge></div>
                <Text size="sm" className="mt-2"><code>{resource.uri}</code></Text>
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
