import { Card, CardHeader, CardTitle, CardDescription, Heading, Text, Stack, EmptyState } from "@matriz/design-ui"
import { mockTenants } from "@matriz/access-tenants"
import { getSeumeiContainer } from "../../src/lib/container"

export default async function SeumeiOwnersPage() {
  const tenant = mockTenants[0]
  const { useCases } = getSeumeiContainer()
  const estabs = await useCases.listEstablishments(tenant.id)

  const entries = await Promise.all(
    estabs.map(async (e) => ({
      est: e,
      owner: await useCases.getOwnerProfile(tenant.id, e.id),
    })),
  )

  const withOwners = entries.filter((x) => x.owner !== null)

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Proprietarios</Heading>
        <Text tone="muted">
          Perfis dos donos dos estabelecimentos.
        </Text>
      </div>

      {withOwners.length === 0 ? (
        <EmptyState title="Nenhum perfil cadastrado" />
      ) : (
        <Stack gap={4}>
          {withOwners.map(({ est, owner }) => (
            <Card key={est.id}>
              <CardHeader>
                <CardTitle>{owner!.ownerName}</CardTitle>
                <CardDescription>{est.name} · {est.city}</CardDescription>
              </CardHeader>
              <Stack gap={2}>
                <Text size="sm"><strong>Email:</strong> {owner!.email}</Text>
                <Text size="sm">{owner!.bio}</Text>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
