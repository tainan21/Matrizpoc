import Link from "next/link"
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Heading,
  Stack,
  Text,
} from "@matriz/design-ui"
import { getGlobalInstitutionalRegistry } from "@matriz/integration-registry-core/institutional"
import { ensureInstitutionalBootstrapped } from "../../src/bootstrap"
import { toEcosystemVM } from "../../src/institutional/presenters"
import { RefreshEcosystemButton } from "../../src/institutional/components/RefreshEcosystemButton"

export const dynamic = "force-dynamic"

export default async function EcosystemPage() {
  await ensureInstitutionalBootstrapped()
  const registry = getGlobalInstitutionalRegistry()
  const vm = toEcosystemVM(registry.list(), registry.stats())

  return (
    <Stack gap={6}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Heading level={1}>Ecosystem</Heading>
          <Text tone="muted">
            Relacoes institucionais entre projetos. Exibe eventos compartilhados,
            distribuicao por source e trust, e mapa de quem produz/consome o que.
          </Text>
        </div>
        <RefreshEcosystemButton />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuicao por source type</CardTitle>
            <CardDescription>
              Como o ecossistema esta classificado na camada institucional.
            </CardDescription>
          </CardHeader>
          <DistBars data={vm.sourceDistribution} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuicao por trust level</CardTitle>
            <CardDescription>
              Niveis de confianca institucional atribuidos aos projetos.
            </CardDescription>
          </CardHeader>
          <DistBars data={vm.trustDistribution} />
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eventos compartilhados</CardTitle>
          <CardDescription>
            Eventos com pelo menos 1 produtor e 1 consumidor no ecossistema.
          </CardDescription>
        </CardHeader>
        {vm.sharedEvents.length === 0 ? (
          <Text tone="muted" size="sm">
            Nenhum evento compartilhado entre produtor e consumidor detectado.
          </Text>
        ) : (
          <ul className="divide-y divide-border">
            {vm.sharedEvents.map((e) => (
              <li key={e.eventName} className="py-3">
                <div className="font-mono text-sm text-surface-fg">{e.eventName}</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <ProjectList label="Produtores" ids={e.producers} tone="success" />
                  <ProjectList label="Consumidores" ids={e.consumers} tone="brand" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Superficies expostas</CardTitle>
          <CardDescription>
            {`Total de superficies publicas produzidas: ${vm.produces.length}. Total consumidas: ${vm.consumes.length}.`}
          </CardDescription>
        </CardHeader>
      </Card>
    </Stack>
  )
}

function DistBars({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0)
  const rows = Object.entries(data).filter(([, v]) => v > 0)
  if (rows.length === 0) {
    return <Text tone="muted" size="sm">Sem dados.</Text>
  }
  return (
    <ul className="space-y-2">
      {rows.map(([k, v]) => {
        const pct = total === 0 ? 0 : Math.round((v / total) * 100)
        return (
          <li key={k} className="flex items-center gap-3">
            <span className="w-48 truncate text-xs text-muted-fg">{k}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-brand"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-12 text-right text-xs text-muted-fg">
              {`${v} (${pct}%)`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function ProjectList({
  label,
  ids,
  tone,
}: {
  label: string
  ids: readonly string[]
  tone: "success" | "brand"
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-fg">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id) => (
          <Link
            key={id}
            href={`/projects/${encodeURIComponent(id)}`}
            style={{ textDecoration: "none" }}
          >
            <Badge tone={tone}>{id}</Badge>
          </Link>
        ))}
      </div>
    </div>
  )
}
