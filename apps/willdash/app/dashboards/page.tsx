import { Card, CardHeader, CardTitle, CardDescription, Stack, Badge, Text } from "@matriz/design-ui"
import { WilldashAppShell } from "../../src/ui/components/AppShell"
import { seedDashboards } from "../../src/mock/seeds"

export default function DashboardsPage() {
  return (
    <WilldashAppShell
      title="Dashboards"
      description="Dashboards configurados por tenant (mock)."
    >
      <Stack gap={6}>
        {seedDashboards.map((d) => (
          <Card key={d.id}>
            <CardHeader>
              <CardTitle>{d.name}</CardTitle>
              <CardDescription>{d.description}</CardDescription>
            </CardHeader>
            <Stack gap={3}>
              {d.widgets.map((w) => (
                <Stack key={w.id} direction="row" gap={3} align="center">
                  <Badge tone="brand">{w.kind}</Badge>
                  <Text style={{ flex: 1 }}>{w.title}</Text>
                  <Text size="sm" tone="muted">
                    {w.sourceApp} - {w.metric}
                  </Text>
                </Stack>
              ))}
            </Stack>
          </Card>
        ))}
      </Stack>
    </WilldashAppShell>
  )
}
