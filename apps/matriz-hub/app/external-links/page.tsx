import { Stack, Card, Heading, Text, EmptyState, Badge } from "@matriz/design-ui"
import { getGlobalExternalLinkStore } from "@matriz/integration-external-links"

export default function ExternalLinksPage() {
  const store = getGlobalExternalLinkStore()
  const links = store.list()

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>External links</Heading>
        <Text tone="muted">
          Vinculos entre entidades de apps distintos (ex: contrato → gig, contrato → estabelecimento).
          Shape pronto para futura persistencia Prisma.
        </Text>
      </div>

      {links.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum vinculo registrado"
            description="Gere contratos no Spot ou Seumei para criar external links."
          />
        </Card>
      ) : (
        <Card>
          <ul className="flex flex-col divide-y divide-border">
            {links.map((link) => (
              <li key={link.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="success">{link.relationType}</Badge>
                  <Text>
                    <code>{`${link.localApp}/${link.localEntityType}#${link.localEntityId}`}</code>
                    {" → "}
                    <code>{`${link.externalApp}/${link.externalEntityType}#${link.externalEntityId}`}</code>
                  </Text>
                </div>
                <Text tone="muted" size="sm">
                  {`Tenant ${link.tenantId} · criado em ${link.createdAt}`}
                </Text>
                {link.snapshot ? (
                  <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(link.snapshot, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Stack>
  )
}
