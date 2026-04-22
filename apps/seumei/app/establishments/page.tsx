import { Card, CardHeader, CardTitle, CardDescription, Heading, Text, Stack, Badge, EmptyState } from "@matriz/design-ui"
import { mockTenants } from "@matriz/access-tenants"
import { getSeumeiContainer } from "../../src/lib/container"
import { toEstablishmentViewModel } from "../../src/ui/presenters/establishment.presenter"
import { EstablishmentActions } from "./EstablishmentActions"

export default async function SeumeiEstablishmentsPage() {
  const tenant = mockTenants[0]
  const { useCases } = getSeumeiContainer()
  const list = await useCases.listEstablishments(tenant.id)
  const vms = list.map(toEstablishmentViewModel)

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Estabelecimentos</Heading>
        <Text tone="muted">
          Locais cadastrados. Ativos podem gerar contratos de prestacao.
        </Text>
      </div>

      {vms.length === 0 ? (
        <EmptyState title="Nenhum estabelecimento" description="Cadastre um para comecar." />
      ) : (
        <Stack gap={4}>
          {vms.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{e.name}</CardTitle>
                    <CardDescription>
                      {e.type} · {e.city}
                    </CardDescription>
                  </div>
                  <Badge tone={e.statusTone}>{e.statusLabel}</Badge>
                </div>
              </CardHeader>
              <Stack gap={2}>
                <Text size="sm"><strong>Endereco:</strong> {e.address}</Text>
                <Text size="sm"><strong>Proprietario:</strong> {e.ownerName}</Text>
                <Text size="sm"><strong>Raio de atendimento:</strong> {e.serviceRadiusDisplay}</Text>
                <EstablishmentActions
                  establishmentId={e.id}
                  establishmentName={e.name}
                  tenantId={tenant.id}
                />
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
