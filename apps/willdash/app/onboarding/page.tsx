import { Card, CardHeader, CardTitle, CardDescription, Heading, Text, Stack, Alert, Badge } from "@matriz/design-ui"
import { sharedSteps, getRegisteredAppStep } from "@matriz/flows-onboarding"
import { asAppId } from "@matriz/foundation-types"

export default function WilldashOnboardingPage() {
  const appStep = getRegisteredAppStep(asAppId("willdash"))

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem" }}>
      <Stack gap={6}>
        <header>
          <Heading level={1}>Onboarding - Willdash</Heading>
          <Text tone="muted">Ultimo passo: escolher quais dashboards ativar.</Text>
        </header>

        <Alert tone="info">
          Willdash nao produz eventos de dominio; apenas consome telemetria dos outros apps.
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Passos compartilhados</CardTitle>
            <CardDescription>Reutilizados de @matriz/flows-onboarding.</CardDescription>
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
