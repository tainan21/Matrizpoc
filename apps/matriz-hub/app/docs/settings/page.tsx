import { Card, CardHeader, CardTitle, Stack, Text, Badge } from "@matriz/design-ui"
import { DocsHeader, DocsNav } from "../../../src/domains/docs/presentation/components"

export const dynamic = "force-dynamic"

const flags = [
  "docs.enabled",
  "docs.graph.enabled",
  "docs.mcp.enabled",
  "docs.semanticSearch.enabled",
  "docs.bulkIngestion.enabled",
  "docs.governanceBridge.enabled",
  "docs.sprintBridge.enabled",
  "docs.exports.enabled",
]

export default function DocsSettingsPage() {
  return (
    <Stack gap={6}>
      <DocsHeader title="Settings" description="Tipos, regras, MCP exposure e feature flags iniciais da MatrizDocs V1." />
      <DocsNav />
      <Card>
        <CardHeader><CardTitle>Feature flags planejadas</CardTitle></CardHeader>
        <div className="flex flex-wrap gap-2">{flags.map((flag) => <Badge key={flag} tone="neutral">{flag}</Badge>)}</div>
      </Card>
      <Card>
        <CardHeader><CardTitle>Politicas V1</CardTitle></CardHeader>
        <Text tone="muted">Tenant guard obrigatorio, actor em acoes sensiveis, MCP auditavel, sugestoes nao sao verdade, exports publicos bloqueiam conteudo sensivel.</Text>
      </Card>
    </Stack>
  )
}
