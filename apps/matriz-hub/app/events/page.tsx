import { Stack, Card, Heading, Text, EmptyState, Badge } from "@matriz/design-ui"
import { getGlobalEventBus } from "@matriz/integration-events"
import { getHubPageRequestContext } from "../../src/auth/page-context"

export default async function EventsPage() {
  const context = await getHubPageRequestContext()
  const bus = getGlobalEventBus()
  const history = bus.history().filter((event) => event.tenantId === context.session.activeTenantId)

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Eventos recentes</Heading>
        <Text tone="muted">
          {`Historico do EventBus global. ${history.length} evento(s) capturado(s). Envelope v1.`}
        </Text>
      </div>

      {history.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum evento ainda"
            description="Execute acoes em Spot, Seumei ou Contracts para gerar eventos e ve-los aqui."
          />
        </Card>
      ) : (
        <Card>
          <ul className="flex flex-col divide-y divide-border">
            {history
              .slice()
              .reverse()
              .map((env) => (
                <li key={env.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="success">{env.name}</Badge>
                    <Badge tone="neutral">{env.sourceApp}</Badge>
                    <Text tone="muted" size="sm">
                      {env.occurredAt}
                    </Text>
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(env.payload, null, 2)}
                  </pre>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </Stack>
  )
}
