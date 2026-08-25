import { Card, CardHeader, CardTitle, CardDescription, Heading, Text, Stack, EmptyState } from "@matriz/design-ui"
import { mockTenants } from "@matriz/access-tenants"
import { getSeumeiContainer } from "../../src/lib/container"
import { toOwnerViewModel } from "../../src/ui/presenters/owner.presenter"

export default async function SeumeiOwnersPage() {
  const tenant = mockTenants[0]
  const { useCases } = getSeumeiContainer()
  const estabs = await useCases.listEstablishments(tenant.id)

  const owners = (await Promise.all(
    estabs.map(async (establishment) => ({
      establishment,
      owner: await useCases.getOwnerProfile(tenant.id, establishment.id),
    })),
  )).flatMap(({ establishment, owner }) => (
    owner ? [toOwnerViewModel(owner, establishment)] : []
  ))

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Proprietarios</Heading>
        <Text tone="muted">
          Perfis dos donos dos estabelecimentos.
        </Text>
      </div>

      {owners.length === 0 ? (
        <EmptyState title="Nenhum perfil cadastrado" />
      ) : (
        <Stack gap={4}>
          {owners.map((owner) => (
            <Card key={owner.id}>
              <CardHeader>
                <CardTitle>{owner.ownerName}</CardTitle>
                <CardDescription>{owner.establishmentName} - {owner.establishmentLocation}</CardDescription>
              </CardHeader>
              <Stack gap={2}>
                <Text size="sm"><strong>Email:</strong> {owner.email}</Text>
                <Text size="sm"><strong>Telefone:</strong> {owner.phoneDisplay}</Text>
                <Text size="sm">{owner.bio}</Text>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
