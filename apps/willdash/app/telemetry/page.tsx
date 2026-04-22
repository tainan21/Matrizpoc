import { Card, CardHeader, CardTitle, Stack, Badge, Text, EmptyState } from "@matriz/design-ui"
import { getGlobalEventBus } from "@matriz/integration-events"
import { WilldashAppShell } from "../../src/ui/components/AppShell"

export const dynamic = "force-dynamic"

export default function TelemetryRawPage() {
  const history = getGlobalEventBus().history()

  return (
    <WilldashAppShell
      title="Telemetria bruta"
      description="Lista cronologica de envelopes no EventBus global."
    >
      {history.length === 0 ? (
        <EmptyState title="Nenhum evento registrado" description="Interaja com outros apps para popular a timeline." />
      ) : (
        <Stack gap={3}>
          {history
            .slice()
            .reverse()
            .map((e) => (
              <Card key={e.id}>
                <CardHeader>
                  <Stack direction="row" gap={3} align="center">
                    <Badge tone="brand">{e.name}</Badge>
                    <Text style={{ flex: 1 }}>{e.sourceApp}</Text>
                    <Text size="sm" tone="muted">
                      {e.occurredAt}
                    </Text>
                  </Stack>
                  <CardTitle style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                    {e.id}
                  </CardTitle>
                </CardHeader>
                <Text size="sm" tone="muted" style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(e.payload, null, 2)}
                </Text>
              </Card>
            ))}
        </Stack>
      )}
    </WilldashAppShell>
  )
}
