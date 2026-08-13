import Link from "next/link"
import { notFound } from "next/navigation"
import { getGlobalInstitutionalRegistry } from "@matriz/integration-registry-core/institutional"
import { ensureInstitutionalBootstrapped } from "../../../src/bootstrap"
import { toProjectDetailVM } from "../../../src/institutional/presenters"
import { HubIcon } from "../../../src/ui/environment/icons"
import { StatusLabel, StatusMark } from "../../../src/ui/environment/status"
import { SurfaceState } from "../../../src/ui/environment/SurfaceState"
import { ContextInspector, MetricStrip, OperationalPageHeader, ProgressTrack } from "../../../src/ui/structure/OperationalPage"
import { presentHealthState } from "../../../src/ui/structure/structure-presenter"

export const dynamic = "force-dynamic"

export default async function ProjectDetailPage({ params }: { readonly params: Promise<{ id: string }> }) {
  await ensureInstitutionalBootstrapped()
  const { id } = await params
  const project = getGlobalInstitutionalRegistry().get(decodeURIComponent(id) as `${string}:${string}`)
  if (!project) notFound()
  const vm = toProjectDetailVM(project)
  const health = presentHealthState(vm.healthStatus)
  const capabilityCount = Object.values(vm.capabilities).reduce((sum, items) => sum + items.length, 0)

  return (
    <div className="hub-page">
      <OperationalPageHeader
        actions={<Link className="hub-context-link" href="/projects">← Voltar ao portfólio</Link>}
        description={vm.tagline ?? "Projeto institucional registrado no snapshot atual."}
        eyebrow={`Projeto / ${vm.projectId}`}
        status={health.status}
        statusLabel={health.label}
        title={vm.displayName}
      />
      <MetricStrip items={[
        { label: "Readiness", value: `${vm.readinessScore}%`, detail: "snapshot institucional", status: health.status, icon: "health" },
        { label: "Checks", value: vm.checks.length, detail: `${vm.checks.filter((check) => check.status !== "pass").length} pedem atenção`, status: vm.checks.some((check) => check.status === "fail") ? "blocked" : vm.checks.some((check) => check.status !== "pass") ? "attention" : "complete", icon: "check" },
        { label: "Contratos", value: capabilityCount, detail: "produz, consome, expõe e requer", status: "available", icon: "architecture" },
        { label: "Visibilidade", value: vm.isPublic ? "Pública" : "Restrita", detail: vm.trustLevelLabel, status: vm.isPublic ? "official" : "temporary", icon: "user" },
      ]} />

      <section className="hub-structure-workspace">
        <div className="hub-project-workspace">
          <section className="hub-project-health hub-panel">
            <div className="hub-panel__heading"><div><p className="hub-eyebrow">Sinais publicados</p><h2>Qualidade e disponibilidade</h2></div><StatusLabel compact status={health.status}>{health.label}</StatusLabel></div>
            <div className="hub-project-health__score"><strong>{vm.readinessScore}</strong><span>/100 readiness</span><ProgressTrack label={`Readiness de ${vm.displayName}`} status={health.status} value={vm.readinessScore} /></div>
            {vm.checks.length ? <ul>{vm.checks.map((check) => {
              const status = check.status === "pass" ? "complete" : check.status === "fail" ? "failed" : "attention"
              return <li key={check.name}><StatusMark status={status} /><span><strong>{check.name}</strong><small>{check.detail ?? check.status}</small></span><StatusLabel compact status={status} /></li>
            })}</ul> : <SurfaceState compact kind="empty" title="Sem checks publicados" description="O projeto não publicou checks no snapshot atual." />}
          </section>

          <section className="hub-capability-board hub-panel">
            <div className="hub-panel__heading"><div><p className="hub-eyebrow">Contrato institucional</p><h2>Como o projeto participa do ecossistema</h2></div><Link href="/ecosystem">Abrir mapa</Link></div>
            <div>{[
              { label: "Produz", items: vm.capabilities.produces, status: "complete" as const },
              { label: "Consome", items: vm.capabilities.consumes, status: "available" as const },
              { label: "Expõe", items: vm.capabilities.exposes, status: "official" as const },
              { label: "Requer", items: vm.capabilities.requires, status: "attention" as const },
            ].map((group) => <article key={group.label}><header><StatusMark status={group.status} /><strong>{group.label}</strong><span>{group.items.length}</span></header>{group.items.length ? <ul>{group.items.map((item, index) => <li key={`${item.kind}:${item.name}:${index}`}><strong>{item.name}</strong><small>{item.kind}{"version" in item && item.version ? ` · ${item.version}` : "path" in item && item.path ? ` · ${item.path}` : ""}</small></li>)}</ul> : <p>Nenhuma declaração.</p>}</article>)}</div>
          </section>
        </div>

        <ContextInspector eyebrow="Inspector do projeto" title={vm.logoText} status={health.status} statusLabel={health.label} footer={vm.links.length ? <div className="hub-project-links">{vm.links.map((link) => <a href={link.url} key={link.url}>{link.label ?? link.kind}</a>)}</div> : undefined}>
          <dl className="hub-inspector-list">
            <div><dt>Projeto</dt><dd>{vm.projectId}</dd></div>
            <div><dt>Origem</dt><dd>{vm.sourceTypeLabel}<br /><small>{vm.sourceType}</small></dd></div>
            <div><dt>Confiança</dt><dd>{vm.trustLevelLabel}<br /><small>{vm.trustLevel}</small></dd></div>
            <div><dt>Ingestão</dt><dd>{vm.ingestModeLabel}</dd></div>
            <div><dt>Owner</dt><dd>{vm.owner}</dd></div>
            <div><dt>Contato</dt><dd>{vm.contact ?? "Não publicado"}</dd></div>
            <div><dt>Último check</dt><dd>{new Date(vm.lastCheckAt).toLocaleString("pt-BR")}</dd></div>
            <div><dt>Ingestado</dt><dd>{new Date(vm.ingestedAt).toLocaleString("pt-BR")}</dd></div>
          </dl>
          {vm.repo ? <a className="hub-entity-action" href={vm.repo}><span className="hub-entity-action__icon"><HubIcon name="docs" size={18} /></span><span><strong>Abrir repositório</strong><small>Repository</small><p>{vm.repo}</p></span><StatusMark status="official" /><HubIcon name="chevron" size={16} /></a> : null}
          {vm.tags.length ? <div className="hub-project-tags">{vm.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div> : null}
        </ContextInspector>
      </section>
    </div>
  )
}
