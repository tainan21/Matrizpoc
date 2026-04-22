import { Stack, Card, Heading, Text, Badge } from "@matriz/design-ui"
import { mockTenants } from "@matriz/access-tenants"
import { getGlobalOnboardingStore } from "@matriz/flows-onboarding"
import { MATRIZ_APP_IDS } from "@matriz/foundation-constants"

export default function OnboardingStatusPage() {
  const store = getGlobalOnboardingStore()

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Status de onboarding</Heading>
        <Text tone="muted">
          Progresso de onboarding por tenant/app. Fluxo compartilhado em
          packages/flows/onboarding.
        </Text>
      </div>

      {mockTenants.map((tenant) => {
        const progress = store.load(tenant.id)
        const completed = Boolean(progress?.completedAt)
        return (
          <Card key={tenant.id}>
            <Heading level={3}>{tenant.name}</Heading>
            <Text tone="muted" size="sm">
              {`Tenant ${tenant.id} · apps habilitados: ${tenant.enabledApps.join(", ")}`}
            </Text>
            <div className="mt-3 flex flex-wrap gap-2">
              {MATRIZ_APP_IDS.map((appId) => {
                const hasAppPayload = progress?.perApp?.[appId] != null
                const tone = completed
                  ? "success"
                  : hasAppPayload
                    ? "warning"
                    : "neutral"
                const label = completed
                  ? "concluido"
                  : hasAppPayload
                    ? "em andamento"
                    : "nao iniciado"
                return (
                  <Badge key={appId} tone={tone}>{`${appId}: ${label}`}</Badge>
                )
              })}
            </div>
          </Card>
        )
      })}
    </Stack>
  )
}
