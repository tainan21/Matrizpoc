import { notFound } from "next/navigation"
import Link from "next/link"
import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Heading,
  Stack,
  Text,
} from "@matriz/design-ui"
import { getGlobalInstitutionalRegistry } from "@matriz/integration-registry-core/institutional"
import { ensureInstitutionalBootstrapped } from "../../../src/bootstrap"
import { toProjectDetailVM } from "../../../src/institutional/presenters"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  await ensureInstitutionalBootstrapped()
  const { id } = await params
  const registry = getGlobalInstitutionalRegistry()
  const projectId = decodeURIComponent(id)
  const project = registry.get(projectId as `${string}:${string}`)
  if (!project) notFound()

  const vm = toProjectDetailVM(project)

  return (
    <Stack gap={6}>
      <div>
        <Link href="/projects" className="text-sm text-muted-fg hover:underline">
          {"< voltar para Projects"}
        </Link>
      </div>

      <Card style={{ borderTop: `4px solid ${vm.brandPrimaryColor}` }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-md text-sm font-semibold"
              style={{ background: vm.brandPrimaryColor, color: "#fff" }}
            >
              {vm.logoText}
            </div>
            <div>
              <Heading level={2}>{vm.displayName}</Heading>
              {vm.tagline ? <Text tone="muted">{vm.tagline}</Text> : null}
              <div className="mt-1 font-mono text-xs text-muted-fg">{vm.projectId}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="neutral">{vm.sourceTypeLabel}</Badge>
            <Badge tone={vm.trustTone}>{vm.trustLevelLabel}</Badge>
            <Badge tone={vm.healthTone}>{`${vm.healthLabel} · ${vm.readinessScore}`}</Badge>
            {vm.isPublic ? <Badge tone="brand">Publico</Badge> : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Classificacao</CardTitle>
            <CardDescription>Como esta fonte foi ingerida e sua confianca.</CardDescription>
          </CardHeader>
          <Stack gap={2}>
            <Text size="sm"><strong>Source type:</strong> {vm.sourceType}</Text>
            <Text size="sm"><strong>Trust level:</strong> {vm.trustLevel}</Text>
            <Text size="sm"><strong>Ingest mode:</strong> {vm.ingestModeLabel}</Text>
            <Text size="sm"><strong>Contract:</strong> v1</Text>
            <Text size="sm"><strong>Ingestado em:</strong> <code>{vm.ingestedAt}</code></Text>
          </Stack>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ownership</CardTitle>
            <CardDescription>Quem e dono institucional do projeto.</CardDescription>
          </CardHeader>
          <Stack gap={2}>
            <Text size="sm"><strong>Owner:</strong> {vm.owner}</Text>
            {vm.contact ? (
              <Text size="sm"><strong>Contato:</strong> {vm.contact}</Text>
            ) : null}
            {vm.repo ? (
              <Text size="sm">
                <strong>Repo:</strong>{" "}
                <a href={vm.repo} className="text-brand underline">{vm.repo}</a>
              </Text>
            ) : null}
            {vm.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {vm.tags.map((t) => (
                  <Badge key={t} tone="neutral">{`#${t}`}</Badge>
                ))}
              </div>
            ) : null}
          </Stack>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health</CardTitle>
            <CardDescription>
              {`Ultimo check: ${new Date(vm.lastCheckAt).toLocaleString("pt-BR")}`}
            </CardDescription>
          </CardHeader>
          <Stack gap={2}>
            {vm.healthObservation ? (
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={vm.healthObservation.nature === "observed" ? "success" : "warning"}>
                  {vm.healthObservation.natureLabel}
                </Badge>
                <Badge tone="neutral">{vm.healthObservation.freshnessLabel}</Badge>
                <Badge tone="neutral">{vm.healthObservation.confidenceLabel}</Badge>
              </div>
            ) : (
              <Badge tone="warning">Proveniencia desconhecida</Badge>
            )}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full"
                    style={{
                      width: `${vm.readinessScore}%`,
                      background: vm.brandPrimaryColor,
                    }}
                  />
                </div>
              </div>
              <div className="text-sm font-semibold text-surface-fg">
                {vm.readinessScore}/100
              </div>
            </div>
            {vm.uptimePercent !== undefined ? (
              <Text size="sm" tone="muted">
                {`Uptime (${vm.uptimeWindow ?? "n/d"}): ${vm.uptimePercent}%`}
              </Text>
            ) : null}
            <ul className="mt-2 space-y-1">
              {vm.checks.map((c) => (
                <li key={c.name} className="flex items-center gap-2 text-sm">
                  <Badge tone={c.tone}>{c.status}</Badge>
                  <span className="text-surface-fg">{c.name}</span>
                  {c.detail ? (
                    <span className="truncate text-xs text-muted-fg">{c.detail}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            {vm.healthObservation ? (
              <Text size="xs" tone="muted">
                {`Fonte: ${vm.healthObservation.sourceId} · coletado em ${new Date(vm.healthObservation.collectedAt).toLocaleString("pt-BR")}`}
              </Text>
            ) : null}
            {vm.healthObservation?.lastError ? (
              <Text size="xs" tone="muted">
                {`Ultimo erro: ${vm.healthObservation.lastError.message}`}
              </Text>
            ) : null}
          </Stack>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration capabilities</CardTitle>
          <CardDescription>O que este projeto produz, consome, expoe e exige.</CardDescription>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CapabilityColumn label="Produz" items={vm.capabilities.produces} tone="success" />
          <CapabilityColumn label="Consome" items={vm.capabilities.consumes} tone="neutral" />
          <CapabilityColumn
            label="Expoe"
            items={vm.capabilities.exposes.map((e) => ({
              kind: e.kind,
              name: e.name,
              version: e.path,
            }))}
            tone="brand"
          />
          <CapabilityColumn
            label="Requer"
            items={vm.capabilities.requires.map((r) => ({ kind: r.kind, name: r.name }))}
            tone="warning"
          />
        </div>
      </Card>

      {vm.metrics ? (
        <Card>
          <CardHeader>
            <CardTitle>Metricas publicas</CardTitle>
            <CardDescription>KPIs institucionais visiveis.</CardDescription>
          </CardHeader>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {vm.metrics.activeUsers !== undefined ? (
              <MetricBox label="Usuarios ativos" value={vm.metrics.activeUsers} />
            ) : null}
            {vm.metrics.reach !== undefined ? (
              <MetricBox label="Alcance" value={vm.metrics.reach} />
            ) : null}
            {vm.metrics.publishedItems !== undefined ? (
              <MetricBox label="Itens publicados" value={vm.metrics.publishedItems} />
            ) : null}
            {vm.metrics.customMetrics.map((m) => (
              <MetricBox
                key={m.key}
                label={m.label}
                value={m.value}
                unit={m.unit}
              />
            ))}
          </div>
          {vm.metrics.lastActivityAt ? (
            <Text size="xs" tone="muted" className="mt-3">
              {`Ultima atividade: ${new Date(vm.metrics.lastActivityAt).toLocaleString("pt-BR")}`}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {vm.links.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Links institucionais</CardTitle>
          </CardHeader>
          <ul className="space-y-1 text-sm">
            {vm.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} className="text-brand underline">
                  {`[${l.kind}] ${l.label ?? l.url}`}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </Stack>
  )
}

function CapabilityColumn({
  label,
  items,
  tone,
}: {
  label: string
  items: ReadonlyArray<{ kind: string; name: string; version?: string }>
  tone: "success" | "neutral" | "brand" | "warning"
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-fg">
        {label}
      </div>
      {items.length === 0 ? (
        <Text size="sm" tone="muted">—</Text>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, idx) => (
            <li key={`${it.kind}:${it.name}:${idx}`} className="flex items-start gap-2">
              <Badge tone={tone}>{it.kind}</Badge>
              <div className="min-w-0 text-sm">
                <div className="truncate text-surface-fg">{it.name}</div>
                {it.version ? (
                  <div className="truncate font-mono text-xs text-muted-fg">{it.version}</div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MetricBox({
  label,
  value,
  unit,
}: {
  label: string
  value: number
  unit?: string
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="text-xs text-muted-fg">{label}</div>
      <div className="text-2xl font-semibold text-surface-fg">
        {value.toLocaleString("pt-BR")}
        {unit && unit !== "count" ? (
          <span className="ml-1 text-sm font-normal text-muted-fg">{unit}</span>
        ) : null}
      </div>
    </div>
  )
}
