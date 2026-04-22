import { Card, CardHeader, CardTitle, CardDescription, Heading, Text, Stack, Alert, Badge } from "@matriz/design-ui"
import { sharedSteps, getRegisteredAppStep } from "@matriz/flows-onboarding"
import { asAppId } from "@matriz/foundation-types"

export default function ContractsOnboardingPage() {
  const appStep = getRegisteredAppStep(asAppId("contracts"))

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem" }}>
      <Stack gap={6}>
        <header>
          <Heading level={1}>Onboarding - Contracts</Heading>
          <Text tone="muted">Fluxo compartilhado + extensao especifica do Contracts.</Text>
        </header>

        <Alert tone="info">
          Este app usa o mesmo fluxo base que Spot, Seumei e Willdash, com um passo
          adicional para configurar templates e assinaturas.
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Passos compartilhados</CardTitle>
            <CardDescription>Comuns a todos os apps do ecossistema.</CardDescription>
          </CardHeader>
          <Stack gap={3}>
            {sharedSteps.map((s) => (
              <Stack key={s.id} direction="row" gap={3} align="center">
                <Badge tone="neutral">{s.id}</Badge>
                <Text>{s.title}</Text>
              </Stack>
            ))}
          </Stack>
        </Card>

        {appStep ? (
          <Card>
            <CardHeader>
              <CardTitle>{appStep.title}</CardTitle>
              <CardDescription>{appStep.description}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </Stack>
    </main>
  )
}
