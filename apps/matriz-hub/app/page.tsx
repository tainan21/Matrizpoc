import Link from "next/link"
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

export default function HubLandingPage() {
  const registry = getGlobalRegistry()
  const apps = registry.listEnabled()

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Matriz Hub</Heading>
        <Text tone="muted">
          {
            "Ponto central do ecossistema. Abaixo os 5 apps da Matriz, seus manifests, eventos, external links e status de onboarding."
          }
        </Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((entry) => (
          <Link
            key={entry.appId}
            href={`/catalog#${entry.appId}`}
            style={{ textDecoration: "none" }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{entry.manifest.name}</CardTitle>
                <CardDescription>{entry.manifest.description}</CardDescription>
              </CardHeader>
              <Stack gap={2}>
                <Text tone="muted" size="sm">
                  {`Rota primaria: ${entry.manifest.primaryRoute} · ${entry.manifest.capabilities.length} capabilities`}
                </Text>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={entry.enabled ? "success" : "neutral"}>
                    {entry.enabled ? "habilitado" : "desabilitado"}
                  </Badge>
                  <Badge tone="neutral">{`contract ${entry.manifest.contractVersion}`}</Badge>
                  {entry.manifest.onboardingSupport.hasSpecificStep ? (
                    <Badge tone="warning">onboarding step</Badge>
                  ) : null}
                </div>
              </Stack>
            </Card>
          </Link>
        ))}
      </div>
    </Stack>
  )
}
