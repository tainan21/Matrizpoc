import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, Heading, Text, Stack, Badge, Alert } from "@matriz/design-ui"
import { mockTenants } from "@matriz/access-tenants"
import { manifest } from "../src/manifest/manifest"
import { getSeumeiContainer } from "../src/lib/container"
import { toEstablishmentViewModel } from "../src/ui/presenters/establishment.presenter"
import { monorepoConfig } from "@matriz/platform-config"

export const dynamic = "force-dynamic"

export default async function SeumeiDashboardPage() {
  const tenant = mockTenants[0]
  const container = getSeumeiContainer()
  const establishments = await container.useCases.listEstablishments(tenant.id)

  const activeCount = establishments.filter((e) => e.status === "active").length
  const draftCount = establishments.filter((e) => e.status === "draft").length

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Seumei</Heading>
        <Text tone="muted">
          {manifest.name} v{manifest.version} — {manifest.description}
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Estabelecimentos</CardTitle>
            <CardDescription>Total no tenant {tenant.name}.</CardDescription>
          </CardHeader>
          <Text size="lg">
            <strong>{establishments.length}</strong>
          </Text>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ativos</CardTitle>
            <CardDescription>Prontos para gerar contratos.</CardDescription>
          </CardHeader>
          <Text size="lg">
            <strong>{activeCount}</strong>
          </Text>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rascunhos</CardTitle>
            <CardDescription>Em preparacao.</CardDescription>
          </CardHeader>
          <Text size="lg">
            <strong>{draftCount}</strong>
          </Text>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proximos estabelecimentos</CardTitle>
          <CardDescription>Ative o fluxo cross-app em /establishments.</CardDescription>
        </CardHeader>
        <Stack gap={3}>
          {establishments.slice(0, 3).map((e) => {
            const vm = toEstablishmentViewModel(e)
            return (
              <div
                key={vm.id}
                className="flex items-center justify-between border-b border-border pb-3 last:border-b-0 last:pb-0"
              >
                <div>
                  <Text>
                    <strong>{vm.name}</strong>
                  </Text>
                  <Text tone="muted" size="sm">
                    {vm.type} · {vm.city} · raio {vm.serviceRadiusDisplay}
                  </Text>
                </div>
                <Badge tone={vm.statusTone}>{vm.statusLabel}</Badge>
              </div>
            )
          })}
        </Stack>
      </Card>

      <Alert tone="info" title="Fluxo de prova cross-app">
        Selecione um estabelecimento em <Link href="/establishments">/establishments</Link>, acione
        &quot;Gerar contrato&quot; e veja o resultado refletido no Hub em{" "}
        <code>{monorepoConfig.baseUrls["matriz-hub"]}/events</code> e{" "}
        <code>{monorepoConfig.baseUrls["matriz-hub"]}/external-links</code>.
      </Alert>
    </Stack>
  )
}
