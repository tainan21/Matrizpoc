import type { InstitutionalRegistryStats } from "@matriz/integration-registry-core/institutional"

const SOURCE_LABELS: Record<string, string> = {
  internal_monorepo_app: "Apps internos",
  trusted_external_app: "Externos confiaveis",
  legacy_app: "Legados",
  third_party_service: "Terceiros",
  mcp_source: "Fontes MCP",
  institutional_source: "Fontes institucionais",
}

const HEALTH_LABELS: Record<string, string> = {
  healthy: "Saudaveis",
  degraded: "Degradados",
  offline: "Offline",
  unknown: "Desconhecidos",
}

export function PublicEcosystemStats({
  stats,
}: {
  stats: InstitutionalRegistryStats
}) {
  const totalSource = Object.values(stats.bySourceType).reduce((a, b) => a + b, 0)
  return (
    <section id="stats" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-pretty text-2xl font-semibold tracking-tight text-surface-fg">
            Saude do ecossistema em tempo real
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-fg">
            Consolidado direto do InstitutionalRegistry. Cada projeto e ingerido
            via pipeline declarativo e classificado pela sua origem.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-fg">
              Distribuicao por origem
            </h3>
            <ul className="space-y-2">
              {Object.entries(stats.bySourceType)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => {
                  const pct = totalSource === 0 ? 0 : Math.round((v / totalSource) * 100)
                  return (
                    <li key={k} className="flex items-center gap-3">
                      <span className="w-44 truncate text-sm text-surface-fg">
                        {SOURCE_LABELS[k] ?? k}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full"
                          style={{ width: `${pct}%`, background: "#111827" }}
                        />
                      </div>
                      <span className="w-16 text-right text-sm text-muted-fg">
                        {`${v} (${pct}%)`}
                      </span>
                    </li>
                  )
                })}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-fg">
              Saude operacional
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(stats.byHealthStatus).map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-md border border-border bg-surface p-4"
                >
                  <div className="text-xs text-muted-fg">
                    {HEALTH_LABELS[k] ?? k}
                  </div>
                  <div className="text-2xl font-semibold text-surface-fg">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-md border border-border bg-surface p-4">
              <div className="text-xs text-muted-fg">Readiness medio</div>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-semibold text-surface-fg">
                  {stats.avgReadinessScore}
                </div>
                <span className="mb-1 text-sm text-muted-fg">/ 100</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full"
                  style={{
                    width: `${stats.avgReadinessScore}%`,
                    background: "#6366f1",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
