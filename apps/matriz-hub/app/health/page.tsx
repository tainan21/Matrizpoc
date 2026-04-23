import Link from "next/link"
import { Badge, Card, CardHeader, CardTitle, Heading, Stack, Text } from "@matriz/design-ui"
import { getGlobalInstitutionalRegistry } from "@matriz/integration-registry-core/institutional"
import { ensureInstitutionalBootstrapped } from "../../src/bootstrap"
import { toHealthOverviewVM } from "../../src/institutional/presenters"

export const dynamic = "force-dynamic"

export default async function HealthPage() {
  await ensureInstitutionalBootstrapped()
  const registry = getGlobalInstitutionalRegistry()
  const vm = toHealthOverviewVM(registry.list(), registry.stats())

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Network health</Heading>
        <Text tone="muted">
          Status operacional consolidado do ecossistema Matriz. Ordenado por
          readiness crescente para destacar projetos que precisam de atencao.
        </Text>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Total" value={vm.totalProjects} tone="neutral" />
        <SummaryCard label="Saudaveis" value={vm.healthyCount} tone="success" />
        <SummaryCard label="Degradados" value={vm.degradedCount} tone="warning" />
        <SummaryCard label="Offline" value={vm.offlineCount} tone="danger" />
        <SummaryCard label="Readiness medio" value={vm.avgReadinessScore} tone="brand" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Readiness por projeto</CardTitle>
        </CardHeader>
        <ul className="divide-y divide-border">
          {vm.projects.map((p) => (
            <li key={p.projectId} className="py-3">
              <Link
                href={`/projects/${encodeURIComponent(p.projectId)}`}
                className="block no-underline"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-surface-fg">
                        {p.displayName}
                      </span>
                      <span className="font-mono text-xs text-muted-fg">
                        {p.projectId}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="h-2 max-w-xs flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full"
                          style={{
                            width: `${p.readinessScore}%`,
                            background: p.brandAccentColor ?? "#6366f1",
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-fg">
                        {`${p.readinessScore}/100`}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <Badge tone={p.healthTone}>{p.healthLabel}</Badge>
                    {p.failedCheckCount > 0 ? (
                      <span className="text-xs text-muted-fg">
                        {`${p.failedCheckCount} check(s) com alerta`}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-fg">
                        {new Date(p.lastCheckAt).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </Stack>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "neutral" | "success" | "warning" | "danger" | "brand"
}) {
  const toneBg = {
    neutral: "bg-muted",
    success: "bg-emerald-100",
    warning: "bg-amber-100",
    danger: "bg-rose-100",
    brand: "bg-brand",
  }[tone]
  const toneFg = {
    neutral: "text-muted-fg",
    success: "text-emerald-800",
    warning: "text-amber-800",
    danger: "text-rose-800",
    brand: "text-brand-fg",
  }[tone]
  return (
    <Card className="flex flex-col gap-1">
      <div className={`w-fit rounded-full px-2 py-0.5 text-xs ${toneBg} ${toneFg}`}>
        {label}
      </div>
      <div className="text-3xl font-semibold text-surface-fg">{value}</div>
    </Card>
  )
}
