import { Card, CardHeader, CardTitle, CardDescription, Heading, Text, Stack, Badge, EmptyState } from "@matriz/design-ui"
import { mockTenants } from "@matriz/access-tenants"
import { getSpotContainer } from "../../src/lib/container"
import { toGigViewModel } from "../../src/ui/presenters/gig.presenter"
import { GigActions } from "./GigActions"

export default async function SpotGigsPage() {
  const tenant = mockTenants[0]
  const { useCases } = getSpotContainer()
  const gigs = await useCases.listGigs(tenant.id)
  const viewModels = gigs.map(toGigViewModel)

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Gigs</Heading>
        <Text tone="muted">
          Gerencie gigs deste tenant. Publicadas podem virar contratos via Contracts.
        </Text>
      </div>

      {viewModels.length === 0 ? (
        <EmptyState
          title="Nenhuma gig cadastrada"
          description="Gigs aparecerao aqui apos cadastro."
        />
      ) : (
        <Stack gap={4}>
          {viewModels.map((g) => (
            <Card key={g.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{g.title}</CardTitle>
                    <CardDescription>
                      {g.venue} · {g.city}
                    </CardDescription>
                  </div>
                  <Badge tone={g.statusTone}>{g.statusLabel}</Badge>
                </div>
              </CardHeader>
              <Stack gap={2}>
                <Text size="sm">
                  <strong>Quando:</strong> {g.scheduledForDisplay} ({g.durationDisplay})
                </Text>
                <Text size="sm">
                  <strong>Cache:</strong> {g.cacheDisplay}
                </Text>
                {g.notes ? (
                  <Text size="sm" tone="muted">
                    {g.notes}
                  </Text>
                ) : null}
                <GigActions gigId={g.id} status={g.statusLabel} tenantId={tenant.id} gigTitle={g.title} />
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
