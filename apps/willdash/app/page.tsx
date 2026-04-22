import { Card, CardHeader, CardTitle, CardDescription, Text, Stack, Badge } from "@matriz/design-ui"
import { WilldashAppShell } from "../src/ui/components/AppShell"
import { aggregateByApp } from "../src/application/telemetry-aggregator"

export const dynamic = "force-dynamic"

export default function WilldashOverview() {
  const agg = aggregateByApp()
  const entries = Object.values(agg)

  return (
    <WilldashAppShell
      title="Overview"
      description="Agregacao em tempo real dos eventos emitidos por todos os apps."
    >
      <Stack gap={6}>
        {entries.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum evento ainda</CardTitle>
              <CardDescription>
                Emita um contract.created no Spot ou Seumei para ver os contadores aqui.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Stack direction="row" gap={4}>
            {entries.map((a) => (
              <Card key={a.appId} style={{ flex: 1 }}>
                <CardHeader>
                  <Stack direction="row" gap={3} align="center">
                    <CardTitle style={{ flex: 1 }}>{a.appId}</CardTitle>
                    <Badge tone="brand">{a.totalEvents}</Badge>
                  </Stack>
                  <CardDescription>
                    {Object.entries(a.byName)
                      .map(([name, count]) => `${name}: ${count}`)
                      .join(" - ")}
                  </CardDescription>
                </CardHeader>
                {a.lastEventAt ? (
                  <Text size="sm" tone="muted">
                    Ultimo: {a.lastEventAt}
                  </Text>
                ) : null}
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </WilldashAppShell>
  )
}
