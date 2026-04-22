import { Card, CardHeader, CardTitle, CardDescription, Heading, Text, Stack, Badge } from "@matriz/design-ui"
import { asTenantId } from "@matriz/foundation-types"
import { bootstrapWilldash } from "../../src/bootstrap"
import { getWilldashContainer } from "../../src/lib/container"
import { toGoalViewModel } from "../../src/ui/presenters/goal.presenter"
import { GoalActions } from "./GoalActions"

export const dynamic = "force-dynamic"

export default async function GoalsPage() {
  bootstrapWilldash()
  const { useCases } = getWilldashContainer()
  const tenantId = asTenantId("tenant-acme")
  const goals = await useCases.listGoals(tenantId)
  const vms = goals.map(toGoalViewModel)

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Metas</Heading>
        <Text tone="muted">Metas do tenant com progresso e status.</Text>
      </div>
      <Stack gap={4}>
        {vms.map((vm) => (
          <Card key={vm.id}>
            <CardHeader>
                <Stack direction="row" gap={3} align="center" className="justify-between">
                <div>
                  <CardTitle>{vm.title}</CardTitle>
                  <CardDescription>{vm.description}</CardDescription>
                </div>
                <Badge tone={vm.statusTone}>{vm.statusLabel}</Badge>
              </Stack>
              <Stack gap={2}>
                <Text size="sm">
                  Progresso: {vm.progressLabel} ({vm.progressPct}%)
                </Text>
                <Text size="sm" tone="muted">
                  Prazo: {vm.dueDisplay}
                </Text>
                <GoalActions goalId={vm.id} goalTitle={vm.title} />
              </Stack>
            </CardHeader>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}
