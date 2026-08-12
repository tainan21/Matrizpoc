import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Heading,
  Text,
  Stack,
  Badge,
  EmptyState,
} from "@matriz/design-ui"
import { collectAllTelemetry, getAllTelemetryClients } from "@matriz/platform-telemetry"
import { bootstrapMatrizHub } from "../../src/bootstrap"
import { getHubPageRequestContext } from "../../src/auth/page-context"

export const dynamic = "force-dynamic"

interface SearchParams {
  app?: string
  type?: string
}

export default async function TelemetryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  bootstrapMatrizHub()
  const context = await getHubPageRequestContext()
  const sp = await searchParams

  const clients = getAllTelemetryClients()
  const all = collectAllTelemetry().filter((event) => event.tenantId === context.session.activeTenantId)
  const filtered = all.filter((e) => {
    if (sp.app && e.appId !== sp.app) return false
    if (sp.type && !e.type.includes(sp.type)) return false
    return true
  })

  const countsByApp = new Map<string, number>()
  for (const e of all) countsByApp.set(e.appId, (countsByApp.get(e.appId) ?? 0) + 1)

  const apps = clients.map((c) => c.appId)

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Telemetria</Heading>
        <Text tone="muted">
          Envelopes de telemetria consolidados de todos os apps registrados via TelemetryClient.
          Eventos sao produzidos por cada bootstrap (L11) e agregados pelo platform/telemetry.
        </Text>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Apps enviando telemetria</CardTitle>
          <CardDescription>Clique para filtrar por app.</CardDescription>
          <Stack direction="row" gap={2} className="flex-wrap">
            <a href="/telemetry" style={{ textDecoration: "none" }}>
              <Badge tone={!sp.app ? "brand" : "neutral"}>Todos ({all.length})</Badge>
            </a>
            {apps.map((appId) => (
              <a key={appId} href={`/telemetry?app=${appId}`} style={{ textDecoration: "none" }}>
                <Badge tone={sp.app === appId ? "brand" : "neutral"}>
                  {appId} ({countsByApp.get(appId) ?? 0})
                </Badge>
              </a>
            ))}
          </Stack>
        </CardHeader>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="Sem telemetria"
          description="Ainda nao ha envelopes registrados. Emita eventos navegando pelos apps ou acionando os casos de uso."
        />
      ) : (
        <Stack gap={3}>
          {filtered.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <Stack direction="row" gap={3} align="center" className="justify-between">
                  <div>
                    <CardTitle>{e.type}</CardTitle>
                    <Text size="sm" tone="muted">
                      app={e.appId} · tenant={e.tenantId} · {e.occurredAt}
                    </Text>
                  </div>
                  <Badge tone="brand">{e.appId}</Badge>
                </Stack>
                <Text size="sm">
                  <code style={{ fontFamily: "var(--font-mono)" }}>
                    {JSON.stringify(e.properties, null, 0)}
                  </code>
                </Text>
              </CardHeader>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
