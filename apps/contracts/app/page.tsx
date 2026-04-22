import { Card, CardHeader, CardTitle, CardDescription, Heading, Text, Stack, Badge } from "@matriz/design-ui"
import { asTenantId } from "@matriz/foundation-types"
import { ContractsAppShell } from "../src/ui/components/AppShell"
import { getContractsContainer } from "../src/lib/container"

const TENANT = asTenantId("tenant-acme")

export default async function ContractsDashboard() {
  const useCases = getContractsContainer()
  const counts = await useCases.countByStatus(TENANT)
  const contracts = await useCases.listContracts(TENANT)

  return (
    <ContractsAppShell
      title="Dashboard de contratos"
      description="Visao operacional dos contratos do tenant atual."
    >
      <Stack gap={6}>
        <Stack direction="row" gap={4}>
          {Object.entries(counts).map(([status, count]) => (
            <Card key={status} style={{ flex: 1 }}>
              <CardHeader>
                <Text size="sm" tone="muted">
                  {status}
                </Text>
                <CardTitle>{count}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </Stack>

        <Card>
          <CardHeader>
            <CardTitle>Ultimos contratos</CardTitle>
            <CardDescription>Origem manual ou cross-app (Spot / Seumei).</CardDescription>
          </CardHeader>
          <Stack gap={3}>
            {contracts.slice(0, 5).map((c) => (
              <Stack key={c.id} direction="row" gap={4} align="center">
                <Heading level={4} style={{ margin: 0, flex: 1 }}>
                  {c.title}
                </Heading>
                <Badge tone="brand">{c.originApp}</Badge>
                <Text tone="muted">
                  {c.currency} {c.amount.toFixed(2)}
                </Text>
              </Stack>
            ))}
          </Stack>
        </Card>
      </Stack>
    </ContractsAppShell>
  )
}
