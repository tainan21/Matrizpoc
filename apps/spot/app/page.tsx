import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, Heading, Text, Stack, Badge } from "@matriz/design-ui"
import { mockTenants } from "@matriz/access-tenants"
import { getSpotContainer } from "../src/lib/container"
import { toGigViewModel } from "../src/ui/presenters/gig.presenter"

export default async function SpotDashboardPage() {
  const tenant = mockTenants[0]
  const { useCases } = getSpotContainer()
  const gigs = await useCases.listGigs(tenant.id)
  const bands = await useCases.listBands(tenant.id)
  const viewModels = gigs.map(toGigViewModel)

  const upcoming = viewModels.slice(0, 3)
  const draftCount = gigs.filter((g) => g.status === "draft").length
  const publishedCount = gigs.filter((g) => g.status === "published").length

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Spot</Heading>
        <Text tone="muted">
          Gigs, bandas e artistas do tenant {tenant.name}.
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Gigs totais</CardTitle>
            <CardDescription>Registro acumulado no tenant.</CardDescription>
          </CardHeader>
          <Text size="lg">
            <strong>{gigs.length}</strong>
          </Text>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rascunhos</CardTitle>
            <CardDescription>Aguardando publicacao.</CardDescription>
          </CardHeader>
          <Text size="lg">
            <strong>{draftCount}</strong>
          </Text>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Publicadas</CardTitle>
            <CardDescription>Disponiveis para booking.</CardDescription>
          </CardHeader>
          <Text size="lg">
            <strong>{publishedCount}</strong>
          </Text>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proximas gigs</CardTitle>
          <CardDescription>Visao resumida — detalhes em /gigs.</CardDescription>
        </CardHeader>
        <Stack gap={3}>
          {upcoming.length === 0 ? (
            <Text tone="muted">Nenhuma gig cadastrada.</Text>
          ) : (
            upcoming.map((g) => (
              <div key={g.id} className="flex items-center justify-between border-b border-border pb-3 last:border-b-0 last:pb-0">
                <div>
                  <Text>
                    <strong>{g.title}</strong>
                  </Text>
                  <Text tone="muted" size="sm">
                    {g.venue} · {g.city} · {g.scheduledForDisplay}
                  </Text>
                </div>
                <Badge tone={g.statusTone}>{g.statusLabel}</Badge>
              </div>
            ))
          )}
        </Stack>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bandas</CardTitle>
          <CardDescription>{bands.length} banda(s) no tenant.</CardDescription>
        </CardHeader>
        <Text tone="muted">
          Acesse <Link href="/bands">/bands</Link> para ver todas.
        </Text>
      </Card>
    </Stack>
  )
}
