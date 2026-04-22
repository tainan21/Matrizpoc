import { Stack, Card, Heading, Text, Badge } from "@matriz/design-ui"
import { mockTenants } from "@matriz/access-tenants"
import { listFlagsForTenant, type FeatureFlagRow } from "@matriz/platform-config"
import type { MatrizAppId } from "@matriz/foundation-constants"
import { MATRIZ_APP_IDS } from "@matriz/foundation-constants"

function groupFlagsByApp(
  flags: readonly FeatureFlagRow[],
): Record<MatrizAppId, FeatureFlagRow[]> {
  const byApp = {} as Record<MatrizAppId, FeatureFlagRow[]>
  for (const app of MATRIZ_APP_IDS) byApp[app] = []
  for (const row of flags) byApp[row.appId].push(row)
  return byApp
}

export default function FeatureFlagsPage() {
  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Feature flags</Heading>
        <Text tone="muted">
          Feature flags mock por tenant e app. Helper isFeatureEnabled vive em
          packages/platform/config (L10).
        </Text>
      </div>

      {mockTenants.map((tenant) => {
        const byApp = groupFlagsByApp(listFlagsForTenant(tenant.id))
        return (
          <Card key={tenant.id}>
            <Heading level={3}>{tenant.name}</Heading>
            <Text tone="muted" size="sm">{`Tenant ${tenant.id}`}</Text>
            <div className="mt-3 flex flex-col gap-3">
              {MATRIZ_APP_IDS.map((appId) => {
                const flags = byApp[appId] ?? []
                return (
                  <div key={appId}>
                    <Text>
                      <strong>{appId}</strong>
                    </Text>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {flags.length === 0 ? (
                        <Text tone="muted" size="sm">
                          (sem flags)
                        </Text>
                      ) : (
                        flags.map((row) => (
                          <Badge
                            key={`${row.flag}-${row.tenantId}`}
                            tone={row.enabled ? "success" : "neutral"}
                          >
                            {`${row.flag}: ${row.enabled ? "on" : "off"}`}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}
    </Stack>
  )
}
