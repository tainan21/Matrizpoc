import { Stack, Card, Heading, Text, Badge } from "@matriz/design-ui"
import { getGlobalRegistry } from "@matriz/integration-registry-core"

export default function RegistryPage() {
  const registry = getGlobalRegistry()
  const apps = registry.listEnabled()

  const allCapabilities = apps.flatMap((e) =>
    e.manifest.capabilities.map((c) => ({ appId: e.appId, cap: c })),
  )
  const allEventsProduced = apps.flatMap((e) =>
    e.manifest.eventsProduced.map((ev) => ({ appId: e.appId, ev })),
  )
  const allEventsConsumed = apps.flatMap((e) =>
    e.manifest.eventsConsumed.map((ev) => ({ appId: e.appId, ev })),
  )

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Registry</Heading>
        <Text tone="muted">
          Visao consolidada. Cada app se registra via bootstrap (L11) lendo o proprio manifest
          (L2).
        </Text>
      </div>

      <Card>
        <Heading level={3}>Capabilities registradas</Heading>
        <ul className="list-disc pl-5 text-sm">
          {allCapabilities.map((c) => (
            <li key={`${c.appId}-${c.cap.id}`}>
              <Badge tone="neutral">{c.appId}</Badge> <code>{c.cap.id}</code> — {c.cap.description}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <Heading level={3}>Eventos produzidos</Heading>
        <ul className="list-disc pl-5 text-sm">
          {allEventsProduced.map((e) => (
            <li key={`${e.appId}-${e.ev}`}>
              <Badge tone="success">{e.appId}</Badge> <code>{e.ev}</code>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <Heading level={3}>Eventos consumidos</Heading>
        <ul className="list-disc pl-5 text-sm">
          {allEventsConsumed.map((e) => (
            <li key={`${e.appId}-${e.ev}`}>
              <Badge tone="neutral">{e.appId}</Badge> <code>{e.ev}</code>
            </li>
          ))}
        </ul>
      </Card>
    </Stack>
  )
}
