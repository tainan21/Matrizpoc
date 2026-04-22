import { Card, CardHeader, CardTitle, CardDescription, Heading, Text, Stack, Badge } from "@matriz/design-ui"
import { mockTenants } from "@matriz/access-tenants"
import { getSpotContainer } from "../../src/lib/container"

export default async function SpotBandsPage() {
  const tenant = mockTenants[0]
  const { useCases } = getSpotContainer()
  const bands = await useCases.listBands(tenant.id)
  const profiles = await useCases.listArtistProfiles(tenant.id)

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Bandas</Heading>
        <Text tone="muted">
          Bandas cadastradas em {tenant.name}.
        </Text>
      </div>

      <Stack gap={4}>
        {bands.map((b) => {
          const profile = profiles.find((p) => p.bandId === b.id)
          return (
            <Card key={b.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>{b.name}</CardTitle>
                    <CardDescription>
                      {b.genre} · {b.city} · {b.memberCount} integrantes
                    </CardDescription>
                  </div>
                  {profile?.hasRider ? <Badge tone="success">Com rider</Badge> : <Badge tone="neutral">Sem rider</Badge>}
                </div>
              </CardHeader>
              <Text size="sm">{b.description}</Text>
              {profile ? (
                <Text size="sm" tone="muted">
                  Nome de palco: <strong>{profile.stageName}</strong>
                </Text>
              ) : null}
            </Card>
          )
        })}
      </Stack>
    </Stack>
  )
}
