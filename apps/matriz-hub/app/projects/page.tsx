import { Heading, Stack, Text, Badge, Card } from "@matriz/design-ui"
import { getGlobalInstitutionalRegistry } from "@matriz/integration-registry-core/institutional"
import { ensureInstitutionalBootstrapped } from "../../src/bootstrap"
import { ProjectCard } from "../../src/institutional/components/ProjectCard"
import { toProjectListItemVM } from "../../src/institutional/presenters"

export const dynamic = "force-dynamic"

export default async function ProjectsPage() {
  await ensureInstitutionalBootstrapped()
  const registry = getGlobalInstitutionalRegistry()
  const projects = registry.list()
  const stats = registry.stats()
  const vms = projects.map(toProjectListItemVM)

  return (
    <Stack gap={6}>
      <div>
        <Heading level={1}>Projects</Heading>
        <Text tone="muted">
          Visao institucional consolidada de todos os projetos do ecossistema
          Matriz. Inclui apps internos da POC e fontes externas institucionais.
        </Text>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-xs text-muted-fg">Total de projetos</div>
          <div className="text-3xl font-semibold text-surface-fg">{stats.total}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted-fg">Apps internos</div>
          <div className="text-3xl font-semibold text-surface-fg">
            {stats.bySourceType.internal_monorepo_app}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-muted-fg">Fontes institucionais</div>
          <div className="text-3xl font-semibold text-surface-fg">
            {stats.bySourceType.institutional_source}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-muted-fg">Readiness medio</div>
          <div className="text-3xl font-semibold text-surface-fg">
            {stats.avgReadinessScore}
          </div>
        </Card>
      </div>

      <div>
        <Heading level={3}>Distribuicao por source type</Heading>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(stats.bySourceType).map(([k, v]) =>
            v > 0 ? <Badge key={k} tone="neutral">{`${k}: ${v}`}</Badge> : null,
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vms.map((vm) => (
          <ProjectCard key={vm.projectId} vm={vm} />
        ))}
      </div>
    </Stack>
  )
}
