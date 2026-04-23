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
import type {
  ProjectManifest,
  TelemetryCategory,
} from "@matriz/integration-api-contracts/v1/institutional"
import { ensureInstitutionalBootstrapped } from "../../src/bootstrap"

export const dynamic = "force-dynamic"

const CATEGORIES: ReadonlyArray<{ id: TelemetryCategory; label: string; desc: string }> = [
  { id: "operational", label: "Operational", desc: "Saude tecnica, erros, latencia." },
  { id: "commercial", label: "Commercial", desc: "Receita, pedidos, conversao." },
  { id: "financial", label: "Financial", desc: "Pagamentos, faturamento, reembolsos." },
  { id: "adoption", label: "Adoption", desc: "DAUs, retencao, ativacao." },
  { id: "ecosystem", label: "Ecosystem", desc: "Integracoes cross-app, eventos." },
  { id: "institutional", label: "Institutional", desc: "Indicadores estrategicos." },
]

export default async function IntelligencePage() {
  await ensureInstitutionalBootstrapped()
  const registry = getGlobalInstitutionalRegistry()
  const projects = registry.list()

  // Agregacao de metricas publicas (Fase 3): telemetria por categoria esta em
  // scaffold na superficie do contract; aqui consolidamos o que existe hoje
  // — metricas publicas por projeto — e exibimos os "slots" das 6 categorias.
  const totalActiveUsers = projects.reduce(
    (acc, p) => acc + (p.metrics?.activeUsers ?? 0),
    0,
  )
  const totalReach = projects.reduce((acc, p) => acc + (p.metrics?.reach ?? 0), 0)
  const totalPublished = projects.reduce(
    (acc, p) => acc + (p.metrics?.publishedItems ?? 0),
    0,
  )

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Intelligence</Heading>
        <Text tone="muted">
          Telemetria institucional consolidada por categoria. Na V1.2 esta
          superficie exibe agregacoes baseadas em metricas publicas; o
          contract de TelemetrySummary por categoria esta disponivel para
          consumo por apps que optem por publicar.
        </Text>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-xs text-muted-fg">Usuarios ativos (agregado)</div>
          <div className="text-3xl font-semibold text-surface-fg">
            {totalActiveUsers.toLocaleString("pt-BR")}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-muted-fg">Alcance (agregado)</div>
          <div className="text-3xl font-semibold text-surface-fg">
            {totalReach.toLocaleString("pt-BR")}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-muted-fg">Itens publicados</div>
          <div className="text-3xl font-semibold text-surface-fg">
            {totalPublished.toLocaleString("pt-BR")}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{c.label}</CardTitle>
                <Badge tone="neutral">categoria</Badge>
              </div>
              <CardDescription>{c.desc}</CardDescription>
            </CardHeader>
            <CategorySlot category={c.id} projects={projects} />
          </Card>
        ))}
      </div>
    </Stack>
  )
}

function CategorySlot({
  category,
  projects,
}: {
  category: TelemetryCategory
  projects: readonly ProjectManifest[]
}) {
  const publishing = projects.filter((p) => {
    const cat = p.telemetry?.categories?.[category]
    return cat !== undefined && cat.count > 0
  })
  if (publishing.length === 0) {
    return (
      <Text size="sm" tone="muted">
        Nenhum projeto publicou telemetria nesta categoria ainda.
      </Text>
    )
  }
  return (
    <ul className="space-y-1 text-sm">
      {publishing.map((p) => {
        const cat = p.telemetry!.categories![category]!
        return (
          <li key={p.projectId} className="flex items-center justify-between">
            <span className="text-surface-fg">{p.displayName}</span>
            <Badge tone="brand">{`${cat.count} eventos`}</Badge>
          </li>
        )
      })}
    </ul>
  )
}
