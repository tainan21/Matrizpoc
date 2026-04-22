import { Card, CardHeader, CardTitle, CardDescription, Heading, Text, Stack, Alert, Badge } from "@matriz/design-ui"
import { sharedSteps, getRegisteredAppStep } from "@matriz/flows-onboarding"
import { asAppId } from "@matriz/foundation-types"

export default function SpotOnboardingPage() {
  const appStep = getRegisteredAppStep(asAppId("spot"))

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Onboarding (Spot)</Heading>
        <Text tone="muted">
          Fluxo compartilhado com o Hub. Etapas globais + especifica do Spot.
        </Text>
      </div>

      <Alert tone="info" title="Fluxo compartilhado">
        As etapas globais ficam no pacote <code>@matriz/flows-onboarding</code>. Cada app registra sua
        propria etapa via <code>registerAppStep()</code> em seu bootstrap.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Etapas globais</CardTitle>
          <CardDescription>Comuns a todos os tenants.</CardDescription>
        </CardHeader>
        <Stack gap={2}>
          {sharedSteps.map((s) => (
            <div key={s.id} className="flex items-start gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0">
              <Badge tone="neutral">{s.order}</Badge>
              <div>
                <Text><strong>{s.title}</strong></Text>
                <Text size="sm" tone="muted">{s.description}</Text>
              </div>
            </div>
          ))}
        </Stack>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Etapa especifica do Spot</CardTitle>
          <CardDescription>Injetada em runtime no bootstrap do app.</CardDescription>
        </CardHeader>
        {appStep ? (
          <Stack gap={1}>
            <Text><strong>{appStep.title}</strong></Text>
            <Text size="sm" tone="muted">{appStep.description}</Text>
            <Badge tone="brand">Registrado em bootstrap</Badge>
          </Stack>
        ) : (
          <Text tone="muted">Bootstrap ainda nao rodou neste runtime.</Text>
        )}
      </Card>
    </Stack>
  )
}
