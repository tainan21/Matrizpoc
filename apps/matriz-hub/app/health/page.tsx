import Link from "next/link"
import { getGlobalInstitutionalRegistry } from "@matriz/integration-registry-core/institutional"
import { ensureInstitutionalBootstrapped } from "../../src/bootstrap"
import { toHealthOverviewVM } from "../../src/institutional/presenters"
import { HubIcon } from "../../src/ui/environment/icons"
import { StatusLabel } from "../../src/ui/environment/status"
import { SurfaceState } from "../../src/ui/environment/SurfaceState"
import { MetricStrip, OperationalPageHeader, ProgressTrack } from "../../src/ui/structure/OperationalPage"
import { presentHealthState } from "../../src/ui/structure/structure-presenter"

export const dynamic = "force-dynamic"

export default async function HealthPage() {
  await ensureInstitutionalBootstrapped()
  const registry = getGlobalInstitutionalRegistry()
  const vm = toHealthOverviewVM(registry.list(), registry.stats())
  const overall = vm.offlineCount > 0 ? "blocked" : vm.degradedCount > 0 ? "attention" : vm.unknownCount > 0 ? "unknown" : vm.totalProjects > 0 ? "complete" : "unavailable"

  return (
    <div className="hub-page">
      <OperationalPageHeader
        description="Sinais publicados pelos projetos, ordenados para revelar primeiro o que está bloqueado, degradado ou sem leitura."
        eyebrow="Centro operacional / saúde"
        status={overall}
        statusLabel={overall === "complete" ? "Leituras saudáveis" : "Há sinais que pedem atenção"}
        title="Saúde do ecossistema"
      />
      <MetricStrip items={[
        { label: "Projetos com sinal", value: vm.totalProjects, detail: "snapshot atual", status: "available", icon: "health" },
        { label: "Saudáveis", value: vm.healthyCount, detail: "checks publicados", status: "complete", icon: "check" },
        { label: "Requer atenção", value: vm.degradedCount, detail: "leitura degradada", status: vm.degradedCount ? "attention" : "complete", icon: "warning" },
        { label: "Sem resposta", value: vm.offlineCount, detail: "sinal offline", status: vm.offlineCount ? "blocked" : "complete", icon: "activity" },
        { label: "Readiness médio", value: `${vm.avgReadinessScore}%`, detail: "média institucional", status: vm.avgReadinessScore >= 80 ? "complete" : "attention", icon: "telemetry" },
      ]} />

      <section className="hub-structure-main">
        <header className="hub-structure-toolbar"><div><h2>Leituras por projeto</h2><small>Origem: snapshot institucional</small></div><Link className="hub-context-link" href="/projects">Abrir portfólio</Link></header>
        {vm.projects.length === 0 ? (
          <SurfaceState compact kind="unavailable" title="Sem leitura institucional" description="Nenhum projeto publicou sinais de saúde nesta instância." />
        ) : (
          <div className="hub-entity-rows">
            {vm.projects.map((project) => {
              const state = presentHealthState(project.healthStatus)
              return (
                <Link className="hub-entity-row" href={`/projects/${encodeURIComponent(project.projectId)}`} key={project.projectId}>
                  <span className="hub-entity-row__mark"><HubIcon name="health" size={18} /></span>
                  <span className="hub-entity-row__identity"><strong>{project.displayName}</strong><small>{project.projectId}</small></span>
                  <span className="hub-entity-row__meta"><ProgressTrack label={`Readiness de ${project.displayName}`} status={state.status} value={project.readinessScore} /><span>{project.readinessScore}% readiness</span></span>
                  <span className="hub-entity-row__meta"><strong>{project.failedCheckCount ? `${project.failedCheckCount} checks com alerta` : "Checks publicados"}</strong><span>{new Date(project.lastCheckAt).toLocaleString("pt-BR")}</span></span>
                  <StatusLabel compact status={state.status}>{state.label}</StatusLabel>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
