import { Card, CardHeader, CardTitle, Heading, Text, Stack, Badge, EmptyState } from "@matriz/design-ui"
import { asTenantId } from "@matriz/foundation-types"
import { bootstrapWilldash } from "../../src/bootstrap"
import { getWilldashContainer } from "../../src/lib/container"
import { toActivityViewModel } from "../../src/ui/presenters/goal.presenter"

export const dynamic = "force-dynamic"

export default async function ActivitiesPage() {
  bootstrapWilldash()
  const { useCases } = getWilldashContainer()
  const tenantId = asTenantId("tenant-acme")
  const activities = await useCases.listActivities(tenantId)
  const vms = activities.map(toActivityViewModel)

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Atividades</Heading>
        <Text tone="muted">
          Timeline de atividades registradas por meta ou avulsas.
        </Text>
      </div>

      {vms.length === 0 ? (
        <EmptyState
          title="Sem atividades"
          description="Nenhuma atividade registrada ainda."
        />
      ) : (
        <Stack gap={3}>
          {vms.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <Stack direction="row" gap={3} align="center" className="justify-between">
                  <div>
                    <CardTitle>{a.note}</CardTitle>
                    <Text size="sm" tone="muted">
                      {a.whenDisplay} — valor {a.valueDisplay}
                      {a.goalId ? ` — meta ${a.goalId}` : ""}
                    </Text>
                  </div>
                  <Badge tone={a.kindTone}>{a.kindLabel}</Badge>
                </Stack>
              </CardHeader>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
