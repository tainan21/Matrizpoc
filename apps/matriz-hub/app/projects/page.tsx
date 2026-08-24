import Link from "next/link"
import { getGlobalInstitutionalRegistry } from "@matriz/integration-registry-core/institutional"
import { ensureInstitutionalBootstrapped } from "../../src/bootstrap"
import { toProjectListItemVM } from "../../src/institutional/presenters"
import { HubIcon } from "../../src/ui/environment/icons"
import { StatusLabel } from "../../src/ui/environment/status"
import { SurfaceState } from "../../src/ui/environment/SurfaceState"
import {
  ContextInspector,
  MetricStrip,
  OperationalPageHeader,
  ProgressTrack,
} from "../../src/ui/structure/OperationalPage"
import { presentProjectPortfolio } from "../../src/ui/structure/structure-presenter"

export const dynamic = "force-dynamic"

export default async function ProjectsPage() {
  await ensureInstitutionalBootstrapped()
  const registry = getGlobalInstitutionalRegistry()
  const stats = registry.stats()
  const projects = presentProjectPortfolio(
    registry.list().map((project) => {
      const vm = toProjectListItemVM(project)
      return {
        projectId: vm.projectId,
        displayName: vm.displayName,
        sourceTypeLabel: vm.sourceTypeLabel,
        sourceType: vm.sourceType,
        trustLevelLabel: vm.trustLevelLabel,
        trustLevel: vm.trustLevel,
        healthStatus: vm.healthStatus,
        readinessScore: vm.readinessScore,
        lastCheckAt: project.health.lastCheckAt,
        accentColor: vm.brandAccentColor,
        tagline: vm.tagline,
      }
    }),
  )
  const focus = projects[0]

  return (
    <div className="hub-page">
      <OperationalPageHeader
        description="Projetos internos e fontes institucionais organizados pela atenção que pedem, com origem e confiança visíveis."
        eyebrow="Centro operacional / portfólio"
        status={projects.some((project) => project.status === "blocked") ? "blocked" : projects.some((project) => project.status === "attention") ? "attention" : "complete"}
        statusLabel={projects.some((project) => project.status === "attention") ? "Há leituras para revisar" : "Portfólio estável"}
        title="Projetos em contexto"
      />

      <MetricStrip items={[
        { label: "Projetos", value: stats.total, detail: "snapshot institucional", status: "available", icon: "project" },
        { label: "Apps internos", value: stats.bySourceType.internal_monorepo_app, detail: "contratos locais", status: "available", icon: "registry" },
        { label: "Fontes institucionais", value: stats.bySourceType.institutional_source, detail: "ingestão de snapshot", status: "temporary", icon: "database" },
        { label: "Readiness médio", value: `${stats.avgReadinessScore}%`, detail: "leitura consolidada", status: stats.avgReadinessScore >= 80 ? "complete" : "attention", icon: "health" },
      ]} />

      <section className="hub-structure-workspace">
        <div className="hub-structure-main">
          <header className="hub-structure-toolbar">
            <div><h2>Fila de leitura</h2><small>Ordenada por severidade e readiness</small></div>
            <Link className="hub-context-link" href="/health">Abrir saúde</Link>
          </header>
          {projects.length === 0 ? (
            <SurfaceState compact kind="empty" title="Nenhum projeto registrado" description="O snapshot institucional não retornou projetos nesta instância." />
          ) : (
            <div className="hub-entity-rows">
              {projects.map((project) => (
                <Link className="hub-entity-row" href={project.href} key={project.projectId}>
                  <span className="hub-entity-row__mark"><HubIcon name="project" size={18} /></span>
                  <span className="hub-entity-row__identity"><strong>{project.displayName}</strong><small>{project.projectId}</small></span>
                  <span className="hub-entity-row__meta"><strong>{project.sourceTypeLabel}</strong><span>{project.trustLevelLabel}</span></span>
                  <span className="hub-entity-row__meta"><ProgressTrack label={`Readiness de ${project.displayName}`} status={project.status} value={project.readinessScore} /><span>{project.readinessScore}% readiness</span></span>
                  <StatusLabel compact status={project.status}>{project.statusLabel}</StatusLabel>
                </Link>
              ))}
            </div>
          )}
        </div>

        {focus ? (
          <ContextInspector eyebrow="Primeiro na fila" title={focus.displayName} status={focus.status} statusLabel={focus.statusLabel} footer={<Link className="hub-action-button" href={focus.href}>Abrir projeto</Link>}>
            <ProgressTrack label={`Readiness de ${focus.displayName}`} status={focus.status} value={focus.readinessScore} />
            <dl className="hub-inspector-list">
              <div><dt>Readiness</dt><dd>{focus.readinessScore}%</dd></div>
              <div><dt>Origem</dt><dd>{focus.sourceTypeLabel}<br /><small>{focus.sourceType}</small></dd></div>
              <div><dt>Confiança</dt><dd>{focus.trustLevelLabel}<br /><small>{focus.trustLevel}</small></dd></div>
              <div><dt>Última leitura</dt><dd>{new Date(focus.lastCheckAt).toLocaleString("pt-BR")}</dd></div>
            </dl>
            <p className="hub-inspector-copy">{focus.tagline ?? "O projeto não publicou uma descrição curta para esta leitura."}</p>
          </ContextInspector>
        ) : null}
      </section>
    </div>
  )
}
