import {
  Stack,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Heading,
  Text,
  Badge,
} from "@matriz/design-ui"
import { getGlobalRegistry } from "@matriz/integration-registry-core"

export default function CatalogPage() {
  const registry = getGlobalRegistry()
  const apps = registry.listEnabled()

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Catalogo de apps</Heading>
        <Text tone="muted">
          Lista completa de apps registrados via @apps/*/public-contract. Fonte: manifest do
          proprio app (L2).
        </Text>
      </div>
      {apps.map((entry) => (
        <Card key={entry.appId} id={entry.appId}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{entry.manifest.name}</CardTitle>
                <CardDescription>{entry.manifest.description}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">{`v${entry.manifest.version}`}</Badge>
                <Badge tone="neutral">{`contract ${entry.manifest.contractVersion}`}</Badge>
              </div>
            </div>
          </CardHeader>
          <Stack gap={3}>
            <div>
              <Text>
                <strong>Base URL:</strong> <code>{entry.baseUrl}</code>
              </Text>
              <Text tone="muted" size="sm">
                {`Dominio: ${entry.manifest.ownership.domainSummary}`}
              </Text>
            </div>
            <div>
              <Text>
                <strong>Rotas</strong>
              </Text>
              <ul className="list-disc pl-5 text-sm">
                {entry.manifest.routes.map((r) => (
                  <li key={r.path}>
                    <code>{r.path}</code> — {r.label}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Text>
                <strong>Capabilities</strong>
              </Text>
              <ul className="list-disc pl-5 text-sm">
                {entry.manifest.capabilities.map((c) => (
                  <li key={c.id}>
                    <code>{c.id}</code> — {c.description}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.manifest.eventsProduced.map((ev) => (
                <Badge key={ev} tone="success">{`produz ${ev}`}</Badge>
              ))}
              {entry.manifest.eventsConsumed.map((ev) => (
                <Badge key={ev} tone="neutral">{`consome ${ev}`}</Badge>
              ))}
            </div>
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}
